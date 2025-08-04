// packages/axle-llm/client/index.js

// Это новая, постоянная точка входа для клиентского бандла.
import React from 'react';
import ReactDOM from 'react-dom/client';

// 1. Делаем React и ReactDOM глобально доступными для всего остального кода.
window.React = React;
window.ReactDOM = ReactDOM;

// ★★★ ГЛАВНОЕ ИСПРАВЛЕНИЕ ★★★
// Мы создаем наш собственный, ПОЛНОСТЬЮ КОНТРОЛИРУЕМЫЙ объект.
// Так как preload.js больше не использует `axle`, конфликта нет.
// Это гарантирует, что `components` будет существовать для всех частей бандла.
window.axle = {
  components: {}
};

// 2. Импортируем *только* функцию инициализации из нашего движка.
import { initialize } from './engine-client.js';

// 3. Явно запускаем движок, когда DOM готов.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}