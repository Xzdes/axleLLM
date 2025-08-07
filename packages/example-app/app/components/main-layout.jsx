// packages/example-app/app/components/main-layout.jsx
import React from 'react';
import Header from './header.jsx';

export default function MainLayout(props) {
  const { pageContent: PageComponent } = props.components || {};
  const currentTheme = props.data?.settings?.currentTheme || 'light';

  // Применяем тему к документу
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', currentTheme);
  }

  return (
    <div className="app-container">
      <div id="header-container">
        <Header {...props} />
      </div>
      
      <main id="pageContent-container">
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