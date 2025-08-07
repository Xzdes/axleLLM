// packages/example-app/app/components/main-layout.jsx
import React from 'react';
import Header from './header.jsx';

export default function MainLayout(props) {
  const { pageContent: PageComponent } = props.components || {};
  const currentTheme = props.data?.settings?.currentTheme || 'light';

  return (
    // ★ ИЗМЕНЕНИЕ: Оборачиваем все в app-shell
    <div id="app-shell" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div id="header-container">
        <Header {...props} />
      </div>
      
      {/* ★ ИЗМЕНЕНИЕ: main теперь растягивается, чтобы кнопка была внизу */}
      <main id="pageContent-container" style={{ flexGrow: 1, position: 'relative' }}>
        {PageComponent && <PageComponent {...props} />}
      </main>

      <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 1000 }}>
        <button
            className="theme-toggle-button" // ★ ИЗМЕНЕНИЕ: Добавляем класс для стилизации
            atom-action="POST /action/toggle-theme"
            // ★ ИЗМЕНЕНИЕ: Обновляем app-shell, а не #root
            atom-target="#app-shell" 
        >
          Switch to {currentTheme === 'light' ? 'Dark' : 'Light'} Theme
        </button>
      </div>
    </div>
  );
}