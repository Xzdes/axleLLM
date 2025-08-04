// packages/example-app/app/components/main-layout.jsx
import React from 'react';

export default function MainLayout(props) {
  // ★★★ ИСПРАВЛЕНИЕ: Извлекаем из props.components ★★★
  const { header: HeaderComponent, pageContent: PageComponent } = props.components || {};

  return (
    <>
      <div id="header-container">
        {/* Передаем дальше все props, чтобы дочерние компоненты тоже имели доступ ко всему */}
        {HeaderComponent && <HeaderComponent {...props} />}
      </div>
      <main id="pageContent-container">
        {PageComponent && <PageComponent {...props} />}
      </main>
    </>
  );
}