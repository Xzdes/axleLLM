// packages/axle-llm/client/engine-client.js
(function () {
  'use strict';
  let socketId = null;
  let currentSearchController = null;
  let ws = null; 

  function initialize() {
    console.log('[axle-client] Initializing...');
    const supportedEvents = ['click', 'submit', 'input', 'change'];
    supportedEvents.forEach(eventType => {
      document.body.addEventListener(eventType, handleAction, true);
    });
    document.body.addEventListener('click', handleSpaNavigation, true);
    initializeWebSocket();
    console.log('[axle-client] Initialized successfully.');
  }

  async function handleAction(event) {
    const element = event.target.closest('[atom-action]');
    if (!element) return;
    const requiredEventType = element.getAttribute('atom-event') || (element.tagName === 'FORM' ? 'submit' : 'click');
    if (event.type !== requiredEventType) return;
    event.preventDefault();
    event.stopPropagation();
    const action = element.getAttribute('atom-action');
    const targetSelector = element.getAttribute('atom-target');
    if (!action) return;
    const [method, url] = action.split(' ');
    try {
      if (requiredEventType === 'input' && currentSearchController) {
        currentSearchController.abort();
      }
      currentSearchController = new AbortController();
      const response = await fetch(url, {
        method: method.toUpperCase(),
        headers: { 'Content-Type': 'application/json', 'X-Socket-Id': socketId },
        body: (method.toUpperCase() !== 'GET') ? _getActionBody(element) : undefined,
        signal: currentSearchController.signal,
      });
      if (!response.ok) { throw new Error(`Request failed with status ${response.status}`); }
      const payload = await response.json();
      _processServerPayload(payload, targetSelector, element);
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('[axle-client] Fetch aborted (this is expected).');
        return;
      }
      console.error(`[axle-client] Action failed for "${action}":`, error);
    }
  }

  async function handleSpaNavigation(event, directTarget = null) {
    const link = directTarget || event.target.closest('a[atom-link="spa"]');
    if (!link) return;
    event.preventDefault();
    const targetUrl = new URL(link.href);
    if (window.location.href === targetUrl.href) return;
    
    try {
        const response = await fetch(targetUrl.href, { headers: { 'X-Requested-With': 'axleLLM-SPA' } });
        if (!response.ok) throw new Error(`SPA navigation failed: ${response.status}`);
        const payload = await response.json();
        
        if (payload.redirect) {
            _spaRedirect(payload.redirect); 
            return;
        }

        console.log('[axle-client] Received SPA payload:', payload);

        document.title = payload.title || document.title;
        
        if (payload.bodyClass) {
          document.body.className = payload.bodyClass;
        }

        _updateStylesForSpa(payload.styles);

        for (const partName in payload.injectedParts) {
            // ★★★ УЛУЧШЕННЫЙ ПОИСК КОНТЕЙНЕРА ★★★
            // Сервер генерирует ID вида `pageContent-container`, ищем его.
            const container = document.getElementById(`${partName}-container`);
            if (container) {
                container.innerHTML = payload.injectedParts[partName];
            } else {
                console.warn(`[axle-client] SPA Navigation: Container for '${partName}' with ID '${partName}-container' not found.`);
            }
        }
        history.pushState({ spaUrl: targetUrl.href }, payload.title, targetUrl.href);

    } catch (error) {
        console.error('[axle-client] SPA Navigation failed:', error);
        window.location.href = targetUrl.href;
    }
  }

  function _spaRedirect(url) {
    const fakeLink = document.createElement('a');
    fakeLink.href = url;
    fakeLink.setAttribute('atom-link', 'spa');
    const fakeEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
    handleSpaNavigation(fakeEvent, fakeLink);
  }

  async function _processServerPayload(payload, targetSelector, triggerElement) {
    if (payload.redirect) { _spaRedirect(payload.redirect); return; }

    if (payload.html && targetSelector) {
      const targetElement = document.querySelector(targetSelector);
      if (!targetElement) { console.error(`[axle-client] Target element "${targetSelector}" not found.`); return; }
      
      const activeElement = document.activeElement;
      const shouldPreserveFocus = activeElement && activeElement.id && targetElement.contains(activeElement);
      let activeElementId, selectionStart, selectionEnd;
      
      if (shouldPreserveFocus) {
        activeElementId = activeElement.id;
        selectionStart = activeElement.selectionStart;
        selectionEnd = activeElement.selectionEnd;
      }
      
      targetElement.innerHTML = payload.html;
      
      if (payload.styles && payload.componentName) {
        // При обновлении одного компонента мы просто добавляем/обновляем его стиль
        _updateSingleComponentStyle(payload.componentName, payload.styles);
      }
      
      if (activeElementId) {
        const newActiveElement = document.getElementById(activeElementId);
        if (newActiveElement) {
          newActiveElement.focus();
          if (typeof newActiveElement.setSelectionRange === 'function') {
            newActiveElement.setSelectionRange(selectionStart, selectionEnd);
          }
        }
      }
    }
  }

  function _updateSingleComponentStyle(componentName, css) {
      let styleTag = document.head.querySelector(`style[data-component-name="${componentName}"]`);
      if (!styleTag) {
          styleTag = document.createElement('style');
          styleTag.setAttribute('data-component-name', componentName);
          document.head.appendChild(styleTag);
      }
      styleTag.textContent = css;
  }

  function _updateStylesForSpa(styles) {
    console.log('[axle-client] Updating all SPA styles...');
    document.querySelectorAll('style[data-component-name]').forEach(tag => tag.remove());
    (styles || []).forEach(styleInfo => {
        _updateSingleComponentStyle(styleInfo.name, styleInfo.css);
    });
  }

  function _getActionBody(element) {
    const form = element.closest('form');
    const payload = element.getAttribute('atom-payload');
    const data = {};
    if (form) {
      const formData = new FormData(form);
      for (const [key, value] of formData.entries()) { data[key] = value; }
    }
    if (payload) {
      try { Object.assign(data, JSON.parse(payload)); }
      catch(e) { console.error('Invalid atom-payload JSON:', payload); }
    }
    if (element.name && element.value !== undefined && !data.hasOwnProperty(element.name)) { 
        data[element.name] = element.value; 
    }
    return JSON.stringify(data);
  }

  function initializeWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    ws = new WebSocket(wsUrl);

    ws.onopen = () => { console.log('[axle-client] WebSocket connection established.'); };
    ws.onmessage = (message) => {
      try {
        const data = JSON.parse(message.data);
        if (data.type === 'socket_id_assigned') {
          socketId = data.id;
          console.log(`[axle-client] WebSocket ID assigned: ${socketId}`);
          return;
        }
        if (data.type === 'html_update' && data.payload) {
            _processServerPayload(data.payload, data.payload.targetSelector);
            return;
        }
      } catch (e) { console.error('[axle-client] Failed to handle WebSocket message:', e); }
    };
    ws.onclose = () => {
      console.log('[axle-client] WebSocket connection closed. Reconnecting in 3 seconds...');
      socketId = null;
      ws = null;
      setTimeout(initializeWebSocket, 3000);
    };
    ws.onerror = (error) => { console.error('[axle-client] WebSocket error:', error); ws.close(); };
  }

  window.addEventListener('popstate', (event) => {
    if (event.state && event.state.spaUrl) { _spaRedirect(event.state.spaUrl); }
  });
  
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', initialize); } else { initialize(); }
})();