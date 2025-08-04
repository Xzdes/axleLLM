// packages/axle-llm/client/index.js

// Это новая, постоянная точка входа для клиентского бандла.
import React from 'react';
import ReactDOM from 'react-dom/client';

// 1. Делаем React и ReactDOM глобально доступными для всего остального кода.
window.React = React;
window.ReactDOM = ReactDOM;

// ★★★ ЭТО И ЕСТЬ ИСПРАВЛЕНИЕ ★★★
// Мы инициализируем глобальный объект ЗДЕСЬ, в самом начале.
// Это гарантирует, что `window.axle.components` будет существовать
// до того, как его попытается использовать engine-client.js или
// скрипты регистрации компонентов, которые добавляются в конец бандла.
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