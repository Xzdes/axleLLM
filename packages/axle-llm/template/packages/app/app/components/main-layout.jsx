// packages/app/app/components/main-layout.jsx
import React from 'react';

/**
 * Главный макет приложения.
 * @param {object} props
 * @param {object} props.globals - Глобальные переменные из manifest.js.
 * @param {object} props.components - Объект с "инъектируемыми" компонентами из роута.
 */
export default function MainLayout(props) {
  // Извлекаем компонент, который должен быть отрендерен
  // в основной части страницы.
  const { pageContent: PageComponent } = props.components || {};

  return (
    <>
      <header
        style={{
          height: 'var(--header-height)',
          backgroundColor: '#fff',
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
          borderBottom: '1px solid #e0e0e0',
          boxSizing: 'border-box'
        }}
      >
        <h1>{props.globals.appName || 'AxleLLM App'}</h1>
      </header>

      <main
        id="pageContent-container"
        style={{
          padding: '24px',
          height: 'calc(100vh - var(--header-height))',
          backgroundColor: 'var(--primary-bg)',
          overflowY: 'auto',
          boxSizing: 'border-box'
        }}
      >
        {/* Рендерим здесь тот компонент, который указан в `inject` роута */}
        {PageComponent && <PageComponent {...props} />}
      </main>
    </>
  );
}