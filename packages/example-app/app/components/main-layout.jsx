// packages/example-app/app/components/main-layout.jsx
import React from 'react';
import Header from './header.jsx';

export default function MainLayout(props) {
  // Извлекаем компонент контента страницы, который передается через props.
  const { pageContent: PageComponent } = props.components || {};
  const currentTheme = props.data?.settings?.currentTheme || 'light';

  // Мы убрали лишний div с id="app-shell". Компонент сам является "оболочкой".
  // Стили для высоты и flex-направления теперь можно применить прямо к :host в CSS,
  // но для простоты оставим их инлайновыми здесь.
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div id="header-container">
        <Header {...props} />
      </div>
      
      <main id="pageContent-container" style={{ flexGrow: 1, position: 'relative' }}>
        {PageComponent && <PageComponent {...props} />}
      </main>

      <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 1000 }}>
        <button
            className="theme-toggle-button"
            atom-action="POST /action/toggle-theme"
            // ★★★ КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ ★★★
            // Целимся в самый корневой элемент, чтобы React заменил
            // все его содержимое, а не вкладывал одно в другое.
            atom-target="#root" 
        >
          Switch to {currentTheme === 'light' ? 'Dark' : 'Light'} Theme
        </button>
      </div>
    </div>
  );
}