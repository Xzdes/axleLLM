// packages/example-app/app/components/main-layout.jsx
import React from 'react';

// ПРИНИМАЕМ ВСЕ PROPS, А НЕ ТОЛЬКО header И pageContent
export default function MainLayout(props) {
  // Получаем ТИПЫ компонентов из props
  const { header: HeaderComponent, pageContent: PageComponent } = props;

  return (
    <>
      <div id="header-container">
        {/* Создаем элемент из типа, передавая ему ВСЕ props */}
        {HeaderComponent && <HeaderComponent {...props} />}
      </div>
      <main id="pageContent-container">
        {/* Создаем элемент из типа, передавая ему ВСЕ props */}
        {PageComponent && <PageComponent {...props} />}
      </main>
    </>
  );
}