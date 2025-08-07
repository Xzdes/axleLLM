// packages/axle-llm/client/engine-client.js
'use strict';

window.axle = window.axle || {};
window.axle.components = window.axle.components || {};

// --- Глобальное состояние ---
let socketId = null;
let currentActionController = null;
let ws = null;
let mainRoot = null; // ★★★ НОВОЕ: Хранилище для главного корня React ★★★
const componentRoots = new Map();
const activeSocketSubscriptions = new Set();

export function initialize() {
  console.log('[axle-client] Initializing React-powered client...');
  hydrateRoot();

  const supportedEvents = ['click', 'submit', 'input', 'change'];
  supportedEvents.forEach(eventType => {
    document.body.addEventListener(eventType, handleDOMEvent, true);
  });

  initializeWebSocket();
  initializeMutationObserver();
  console.log('[axle-client] Initialized successfully.');
}

function hydrateRoot() {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    return console.error('[axle-client] CRITICAL: Root element with id="root" not found.');
  }
  try {
    if (!window.React || !window.ReactDOM) {
      return console.error('[axle-client] CRITICAL: React or ReactDOM not found on window object.');
    }
    const ClientAppShell = () => null;
    // ★★★ ИЗМЕНЕНИЕ: Сохраняем главный корень ★★★
    mainRoot = window.ReactDOM.hydrateRoot(rootElement, window.React.createElement(ClientAppShell, {}));
    console.log('[axle-client] Hydration complete.');
  } catch (e) {
    console.error('[axle-client] CRITICAL: Hydration failed.', e);
  }
}

async function handleDOMEvent(event) {
  const element = event.target.closest('[atom-action]');
  if (!element) return;
  const requiredEventType = element.getAttribute('atom-event') || (element.tagName === 'FORM' ? 'submit' : 'click');
  if (event.type !== requiredEventType) return;
  event.preventDefault();
  event.stopPropagation();
  executeAction(element, requiredEventType);
}

async function executeAction(element, triggerType) {
  const action = element.getAttribute('atom-action');
  const targetSelector = element.getAttribute('atom-target');
  if (!action) return;

  if (triggerType === 'input' && currentActionController) {
    currentActionController.abort();
  }
  currentActionController = new AbortController();

  const [method, url] = action.split(' ');

  try {
    const response = await fetch(url, {
      method: method.toUpperCase(),
      headers: { 'Content-Type': 'application/json', 'X-Socket-Id': socketId },
      body: method.toUpperCase() !== 'GET' ? getActionBody(element) : undefined,
      signal: currentActionController.signal,
    });

    if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
    
    const payload = await response.json();
    await processServerPayload(payload, targetSelector);

  } catch (error) {
    if (error.name !== 'AbortError') console.error(`[axle-client] Action failed for "${action}":`, error);
  }
}

async function processServerPayload(payload, targetSelector) {
    // ... (код bridgeCalls и awaitingBridgeCall остается без изменений) ...

  if (payload.redirect) {
    window.location.href = payload.redirect;
    return;
  }

  // ★★★ НАЧАЛО КЛЮЧЕВЫХ ИЗМЕНЕНИЙ ★★★
  if (payload.update) {
    const { update: componentName, props } = payload;
    if (!props) return console.error(`[axle-client] Invalid payload for update on "${componentName}": 'props' is missing.`);
    
    const Component = window.axle.components[componentName];
    if (!Component) return console.error(`[axle-client] Component definition for '${componentName}' not found.`);

    const targetElement = document.querySelector(targetSelector);
    if (!targetElement) return console.error(`[axle-client] Target element "${targetSelector}" not found.`);

    // Сохраняем новые данные для возможного использования другими скриптами
    if (props.data) window.__INITIAL_DATA__ = props.data;

    let rootToRenderOn;
    
    // Если цель - это главный корень приложения, используем сохраненный `mainRoot`
    if (targetSelector === '#root' && mainRoot) {
        rootToRenderOn = mainRoot;
    } else {
        // В противном случае, ищем или создаем корень для конкретного компонента
        let root = componentRoots.get(targetSelector);
        if (!root) {
            root = window.ReactDOM.createRoot(targetElement);
            componentRoots.set(targetSelector, root);
        }
        rootToRenderOn = root;
    }
    
    // Выполняем рендер на правильном корне
    rootToRenderOn.render(window.React.createElement(Component, props));
  }
  // ★★★ КОНЕЦ КЛЮЧЕВЫХ ИЗМЕНЕНИЙ ★★★
}

function getActionBody(element) {
  const form = element.closest('form');
  const data = {};
  if (form) new FormData(form).forEach((value, key) => { data[key] = value; });
  const payloadAttr = element.getAttribute('atom-payload');
  if (payloadAttr) try { Object.assign(data, JSON.parse(payloadAttr)); } catch (e) { console.error('Invalid atom-payload JSON:', payloadAttr); }
  if (element.name && element.value !== undefined && !data.hasOwnProperty(element.name)) data[element.name] = element.value;
  return JSON.stringify(data);
}
/**
 * Инициализирует WebSocket.
 */
function initializeWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(`${protocol}//${window.location.host}`);
  
  ws.onopen = () => {
    console.log('[axle-client] WebSocket connection established.');
    scanAndSubscribeToSockets();
  };
  
  ws.onmessage = (message) => {
    try {
      const data = JSON.parse(message.data);
      if (data.type === 'socket_id_assigned') {
        socketId = data.id;
        console.log(`[axle-client] WebSocket ID assigned: ${socketId}`);
      } else if (data.type === 'event' && data.event) {
        document.querySelectorAll(`[atom-on-event="${data.event}"]`).forEach(el => executeAction(el, 'websocket'));
      }
    } catch (e) { 
      console.error('[axle-client] Failed to handle WebSocket message:', e);
    }
  };

  ws.onclose = () => {
    console.log('[axle-client] WebSocket connection closed. Reconnecting in 3 seconds...');
    socketId = null; 
    ws = null;
    activeSocketSubscriptions.clear();
    setTimeout(initializeWebSocket, 3000);
  };

  ws.onerror = (error) => {
    console.error('[axle-client] WebSocket error:', error);
    ws.close();
  };
}

/**
 * Сканирует DOM на предмет подписок на WebSocket.
 */
function scanAndSubscribeToSockets() {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  document.querySelectorAll('[atom-socket]').forEach(el => {
    const channel = el.getAttribute('atom-socket');
    if (channel && !activeSocketSubscriptions.has(channel)) {
      activeSocketSubscriptions.add(channel);
      ws.send(JSON.stringify({ type: 'subscribe', channel }));
    }
  });
}

/**
 * Наблюдает за изменениями в DOM для новых подписок.
 */
function initializeMutationObserver() {
    const observer = new MutationObserver((mutations) => {
        if (mutations.some(m => m.type === 'childList' && m.addedNodes.length > 0)) {
            scanAndSubscribeToSockets();
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });
}