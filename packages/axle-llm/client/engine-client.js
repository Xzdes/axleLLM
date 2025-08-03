// packages/axle-llm/client/engine-client.js
(function () {
  'use strict';

  // --- Global state for the client engine ---
  let socketId = null;
  let currentActionController = null;
  let ws = null;
  // This map will store React roots for components that are targets of actions.
  const componentRoots = new Map();

  /**
   * Main initialization function for the client-side engine.
   */
  function initialize() {
    console.log('[axle-client] Initializing React-powered client...');
    
    // Perform initial hydration of the server-rendered HTML.
    hydrateRoot();

    // Set up global event listeners for declarative actions.
    const supportedEvents = ['click', 'submit', 'input', 'change'];
    supportedEvents.forEach(eventType => {
      document.body.addEventListener(eventType, handleAction, true);
    });

    // Initialize WebSocket for real-time communication.
    initializeWebSocket();

    console.log('[axle-client] Initialized successfully.');
  }

  /**
   * Hydrates the initial server-rendered HTML into an interactive React application.
   */
  async function hydrateRoot() {
    // We assume the server has rendered the initial app into a div with id="root".
    const rootElement = document.getElementById('root');
    if (!rootElement) {
      console.error('[axle-client] CRITICAL: Root element with id="root" not found. Hydration failed.');
      return;
    }

    try {
      // Dynamically import React and ReactDOM. This is just for encapsulation.
      // In a real build process, they would be bundled.
      const React = await Promise.resolve(window.React); // Assuming React is available globally
      const ReactDOM = await Promise.resolve(window.ReactDOM); // Assuming ReactDOM is available globally
      
      // The initial component tree is already rendered. We just need to load its definition.
      // This is a placeholder for a more advanced dynamic loading system.
      // For now, we assume the main component is implicitly loaded.
      // The key is that we have window.__INITIAL_DATA__ available.
      const App = () => React.createElement('div', { dangerouslySetInnerHTML: { __html: rootElement.innerHTML } });

      // Hydrate the app. This makes the server-rendered HTML interactive.
      ReactDOM.hydrateRoot(rootElement, React.createElement(App, { initialData: window.__INITIAL_DATA__ }));
      console.log('[axle-client] Hydration complete.');

    } catch (e) {
      console.error('[axle-client] CRITICAL: Hydration failed.', e);
    }
  }

  /**
   * Handles user interactions that trigger an `atom-action`.
   * @param {Event} event - The DOM event.
   */
  async function handleAction(event) {
    const element = event.target.closest('[atom-action]');
    if (!element) return;

    const requiredEventType = element.getAttribute('atom-event') || (element.tagName === 'FORM' ? 'submit' : 'click');
    if (event.type !== requiredEventType) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    const action = element.getAttribute('atom-action');
    const targetSelector = element.getAttribute('atom-target'); // e.g., "#receipt-container"
    if (!action) return;

    if (requiredEventType === 'input' && currentActionController) {
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
      
      // Process the server's response payload.
      processServerPayload(payload, targetSelector, element);

    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('[axle-client] Fetch aborted for debouncing (this is expected).');
        return;
      }
      console.error(`[axle-client] Action failed for "${action}":`, error);
      // Here you could implement a user-facing error message.
    }
  }
  
  /**
   * Processes the JSON payload from the server after an action.
   * @param {object} payload - The server response.
   * @param {string} targetSelector - The CSS selector for the component to update.
   */
  function processServerPayload(payload, targetSelector) {
    if (payload.redirect) {
      // Handle SPA or full-page redirects
      window.location.href = payload.redirect; // Simplified for now
      return;
    }

    if (payload.update) {
      // The server is telling us to re-render a specific component.
      const componentToUpdate = payload.update;
      const newProps = payload.props;
      
      const targetElement = document.querySelector(targetSelector);
      if (!targetElement) {
        console.error(`[axle-client] Target element "${targetSelector}" for component "${componentToUpdate}" not found.`);
        return;
      }
      
      // Load the component's JS definition (this is a simplified placeholder)
      // In a real app, you'd use dynamic import or have a manifest of component paths.
      const Component = window.axle.components[componentToUpdate];
      
      if (!Component) {
          console.error(`[axle-client] Component definition for '${componentToUpdate}' not found.`);
          return;
      }

      // Get or create a React root for the target element.
      let root = componentRoots.get(targetSelector);
      if (!root) {
        root = ReactDOM.createRoot(targetElement);
        componentRoots.set(targetSelector, root);
      }
      
      // Re-render the component with the new props. React's VDOM does the magic.
      root.render(React.createElement(Component, newProps));
    }
  }

  /**
   * Extracts the body for a POST/PUT request from a form or payload attributes.
   * @param {HTMLElement} element - The element that triggered the action.
   * @returns {string} - A JSON string.
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
   * Initializes the WebSocket connection for real-time updates.
   */
  function initializeWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    ws = new WebSocket(wsUrl);

    ws.onopen = () => console.log('[axle-client] WebSocket connection established.');
    
    ws.onmessage = (message) => {
      try {
        const data = JSON.parse(message.data);
        if (data.type === 'socket_id_assigned') {
          socketId = data.id;
          console.log(`[axle-client] WebSocket ID assigned: ${socketId}`);
        }
        // Handle other real-time events from the server if necessary
      } catch (e) {
        console.error('[axle-client] Failed to handle WebSocket message:', e);
      }
    };

    ws.onclose = () => {
      console.log('[axle-client] WebSocket connection closed. Reconnecting in 3 seconds...');
      socketId = null;
      ws = null;
      setTimeout(initializeWebSocket, 3000);
    };

    ws.onerror = (error) => {
      console.error('[axle-client] WebSocket error:', error);
      ws.close();
    };
  }

  // --- Start the engine ---
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
})();