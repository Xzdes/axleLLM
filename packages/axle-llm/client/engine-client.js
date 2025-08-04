// packages/axle-llm/client/engine-client.js
'use strict';

// --- Global state for the client engine ---
let socketId = null;
let currentActionController = null;
let ws = null;
const componentRoots = new Map();
// ★ НОВОЕ: Отслеживаем активные подписки, чтобы не дублировать их.
const activeSocketSubscriptions = new Set();

/**
 * Main initialization function for the client-side engine.
 */
export function initialize() {
  console.log('[axle-client] Initializing React-powered client...');
  hydrateRoot();

  // ★ ИЗМЕНЕНИЕ: Функция для обработки событий переименована для ясности.
  const supportedEvents = ['click', 'submit', 'input', 'change'];
  supportedEvents.forEach(eventType => {
    document.body.addEventListener(eventType, handleDOMEvent, true);
  });

  initializeWebSocket();
  initializeMutationObserver(); // ★ НОВОЕ: Запускаем наблюдатель за DOM.
  console.log('[axle-client] Initialized successfully.');
}

/**
 * Hydrates the initial server-rendered HTML.
 */
function hydrateRoot() {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    console.error('[axle-client] CRITICAL: Root element with id="root" not found. Hydration failed.');
    return;
  }
  try {
    if (typeof window.React === 'undefined' || typeof window.ReactDOM === 'undefined') {
      console.error('[axle-client] CRITICAL: React or ReactDOM not found on window object.');
      return;
    }
    const ClientAppShell = () => null;
    window.ReactDOM.hydrateRoot(rootElement, window.React.createElement(ClientAppShell, {}));
    console.log('[axle-client] Hydration complete.');
  } catch (e) {
    console.error('[axle-client] CRITICAL: Hydration failed.', e);
  }
}

/**
 * ★ РЕФАКТОРИНГ: Эта функция теперь только обрабатывает DOM-событие и вызывает executeAction.
 * @param {Event} event - The DOM event.
 */
async function handleDOMEvent(event) {
  const element = event.target.closest('[atom-action]');
  if (!element) return;

  const requiredEventType = element.getAttribute('atom-event') || (element.tagName === 'FORM' ? 'submit' : 'click');
  if (event.type !== requiredEventType) return;

  event.preventDefault();
  event.stopPropagation();

  // Вызываем основную логику выполнения действия.
  executeAction(element, requiredEventType);
}

/**
 * ★ РЕФАКТОРИНГ: Основная логика выполнения действия, вынесенная из обработчика.
 * Может быть вызвана как из DOM-события, так и программно (например, от WebSocket).
 * @param {HTMLElement} element - The element with atom-action attributes.
 * @param {string} triggerType - The type of event that triggered the action ('click', 'input', etc.).
 */
async function executeAction(element, triggerType = 'programmatic') {
  const action = element.getAttribute('atom-action');
  const targetSelector = element.getAttribute('atom-target');
  if (!action) return;

  // Логика прерывания для событий ввода (дебаунсинг)
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

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const payload = await response.json();
    processServerPayload(payload, targetSelector);

  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('[axle-client] Fetch aborted for debouncing (this is expected).');
      return;
    }
    console.error(`[axle-client] Action failed for "${action}":`, error);
  }
}


/**
 * Processes the JSON payload from the server.
 */
function processServerPayload(payload, targetSelector) {
  if (payload.redirect) {
    window.location.href = payload.redirect;
    return;
  }

  if (payload.update) {
    const componentToUpdate = payload.update;
    const newProps = payload.props;
    
    const targetElement = document.querySelector(targetSelector);
    if (!targetElement) {
      console.error(`[axle-client] Target element "${targetSelector}" for component "${componentToUpdate}" not found.`);
      return;
    }
    
    const Component = window.axle.components[componentToUpdate];
    if (!Component) {
      console.error(`[axle-client] Component definition for '${componentToUpdate}' not found.`);
      return;
    }

    let root = componentRoots.get(targetSelector);
    if (!root) {
      root = window.ReactDOM.createRoot(targetElement);
      componentRoots.set(targetSelector, root);
    }
    
    root.render(window.React.createElement(Component, newProps));
  }
}

/**
 * Extracts the body for a POST/PUT request from form data.
 */
function getActionBody(element) {
  const form = element.closest('form');
  const data = {};
  if (form) {
    const formData = new FormData(form);
    for (const [key, value] of formData.entries()) {
      data[key] = value;
    }
  }
  const payloadAttr = element.getAttribute('atom-payload');
  if (payloadAttr) {
    try {
      Object.assign(data, JSON.parse(payloadAttr));
    } catch (e) {
      console.error('Invalid atom-payload JSON:', payloadAttr);
    }
  }
  if (element.name && element.value !== undefined && !data.hasOwnProperty(element.name)) {
    data[element.name] = element.value;
  }
  return JSON.stringify(data);
}

/**
 * Initializes the WebSocket connection.
 */
function initializeWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}`;
  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    console.log('[axle-client] WebSocket connection established.');
    // ★ ИЗМЕНЕНИЕ: При подключении сканируем DOM на наличие уже существующих элементов для подписки.
    scanAndSubscribeToSockets();
  };
  
  ws.onmessage = (message) => {
    try {
      const data = JSON.parse(message.data);

      if (data.type === 'socket_id_assigned') {
        socketId = data.id;
        console.log(`[axle-client] WebSocket ID assigned: ${socketId}`);
        return;
      }
      
      // ★★★ НАЧАЛО НОВОЙ ЛОГИКИ: ОБРАБОТКА PUSH-СОБЫТИЙ ОТ СЕРВЕРА ★★★
      if (data.type === 'event' && data.event) {
        console.log(`[axle-client] Received WebSocket event: '${data.event}'`);
        const subscribedElements = document.querySelectorAll(`[atom-on-event="${data.event}"]`);
        
        if (subscribedElements.length > 0) {
          subscribedElements.forEach(element => {
            console.log(`[axle-client] Triggering action on element for event '${data.event}'`, element);
            // Программно вызываем выполнение действия, связанного с этим элементом.
            executeAction(element);
          });
        }
      }
      // ★★★ КОНЕЦ НОВОЙ ЛОГИКИ ★★★

    } catch (e) {
      console.error('[axle-client] Failed to handle WebSocket message:', e);
    }
  };

  ws.onclose = () => {
    console.log('[axle-client] WebSocket connection closed. Reconnecting in 3 seconds...');
    socketId = null;
    ws = null;
    activeSocketSubscriptions.clear(); // Сбрасываем подписки при разрыве.
    setTimeout(initializeWebSocket, 3000);
  };

  ws.onerror = (error) => {
    console.error('[axle-client] WebSocket error:', error);
    ws.close();
  };
}

/**
 * ★ НОВОЕ: Сканирует DOM в поисках элементов с атрибутом `atom-socket` и подписывается на каналы.
 */
function scanAndSubscribeToSockets() {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;

  document.querySelectorAll('[atom-socket]').forEach(el => {
    const channel = el.getAttribute('atom-socket');
    // Подписываемся только если еще не подписаны на этот канал.
    if (channel && !activeSocketSubscriptions.has(channel)) {
      console.log(`[axle-client] Subscribing to WebSocket channel: '${channel}'`);
      ws.send(JSON.stringify({ type: 'subscribe', channel: channel }));
      activeSocketSubscriptions.add(channel);
    }
  });
}

/**
 * ★ НОВОЕ: Инициализирует MutationObserver для отслеживания появления новых
 * компонентов, которым нужна WebSocket-подписка (например, после AJAX-обновления).
 */
function initializeMutationObserver() {
    const observer = new MutationObserver((mutationsList) => {
        for(const mutation of mutationsList) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                // Проверяем, не появился ли элемент, которому нужна подписка.
                scanAndSubscribeToSockets();
            }
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
}