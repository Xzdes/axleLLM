// packages/axle-llm/client/engine-client.js
'use strict';

// Гарантируем, что глобальный объект существует до выполнения любого другого кода
window.axle = window.axle || {};
window.axle.components = window.axle.components || {};

// --- Глобальное состояние ---
let socketId = null;
let currentActionController = null;
let ws = null;
const componentRoots = new Map();
const activeSocketSubscriptions = new Set();

/**
 * Главная функция инициализации.
 */
export function initialize() {
  console.log('[axle-client] Initializing React-powered client...');
  hydrateRoot();
  ['click', 'submit', 'input', 'change'].forEach(eventType => {
    document.body.addEventListener(eventType, handleDOMEvent, true);
  });
  initializeWebSocket();
  initializeMutationObserver();
  console.log('[axle-client] Initialized successfully.');
}

function hydrateRoot() {
  const rootElement = document.getElementById('root');
  if (!rootElement) return console.error('[axle-client] CRITICAL: Root element not found.');
  try {
    if (!window.React || !window.ReactDOM) return console.error('[axle-client] CRITICAL: React or ReactDOM not found.');
    window.ReactDOM.hydrateRoot(rootElement, window.React.createElement(() => null));
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

async function executeAction(element, triggerType = 'programmatic') {
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
      body: (method.toUpperCase() !== 'GET') ? getActionBody(element) : undefined,
      signal: currentActionController.signal,
    });

    if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
    
    const payload = await response.json();
    processServerPayload(payload, targetSelector);

  } catch (error) {
    if (error.name !== 'AbortError') {
      console.error(`[axle-client] Action failed for "${action}":`, error);
    }
  }
}

function processServerPayload(payload, targetSelector) {
  if (payload.redirect) {
    window.location.href = payload.redirect;
    return;
  }

  if (payload.update) {
    const componentToUpdate = payload.update;
    const propsFromServer = payload.props;

    if (!propsFromServer || !propsFromServer.data) {
        return console.error(`[axle-client] Invalid payload for update: 'props.data' is missing.`);
    }
    
    const targetElement = document.querySelector(targetSelector);
    if (!targetElement) return console.error(`[axle-client] Target element "${targetSelector}" not found.`);
    
    const Component = window.axle.components[componentToUpdate];
    if (!Component) return console.error(`[axle-client] Component definition for '${componentToUpdate}' not found.`);
    
    // ★★★ ФИНАЛЬНОЕ РЕШЕНИЕ ★★★
    // 1. Сервер теперь ВСЕГДА присылает полный и правильный объект props.
    //    Нам больше не нужно ничего "сливать" или угадывать.
    // 2. Просто берем то, что прислал сервер, и рендерим.
    // 3. Также обновляем `window.__INITIAL_DATA__`, чтобы быть готовыми к следующему клику.
    window.__INITIAL_DATA__ = propsFromServer.data;
    
    let root = componentRoots.get(targetSelector);
    if (!root) {
      root = window.ReactDOM.createRoot(targetElement);
      componentRoots.set(targetSelector, root);
    }
    
    root.render(window.React.createElement(Component, propsFromServer));
  }
}

function getActionBody(element) {
  const form = element.closest('form');
  const data = {};
  if (form) {
    const formData = new FormData(form);
    for (const [key, value] of formData.entries()) { data[key] = value; }
  }
  const payloadAttr = element.getAttribute('atom-payload');
  if (payloadAttr) {
    try { Object.assign(data, JSON.parse(payloadAttr)); } 
    catch (e) { console.error('Invalid atom-payload JSON:', payloadAttr); }
  }
  if (element.name && element.value !== undefined && !data.hasOwnProperty(element.name)) {
    data[element.name] = element.value;
  }
  return JSON.stringify(data);
}

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
      } else if (data.type === 'event' && data.event) {
        document.querySelectorAll(`[atom-on-event="${data.event}"]`).forEach(el => executeAction(el));
      }
    } catch (e) { console.error('[axle-client] Failed to handle WebSocket message:', e); }
  };
  ws.onclose = () => {
    console.log('[axle-client] WebSocket connection closed. Reconnecting...');
    socketId = null; ws = null;
    activeSocketSubscriptions.clear();
    setTimeout(initializeWebSocket, 3000);
  };
  ws.onerror = (error) => {
    console.error('[axle-client] WebSocket error:', error);
    ws.close();
  };
}

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

function initializeMutationObserver() {
    const observer = new MutationObserver((mutations) => {
        if (mutations.some(m => m.type === 'childList' && m.addedNodes.length > 0)) {
            scanAndSubscribeToSockets();
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });
}