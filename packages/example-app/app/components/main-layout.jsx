// packages/example-app/app/components/main-layout.jsx
import React from 'react';

// ★★★ НАПОРИСТОЕ ИЗМЕНЕНИЕ: Мы импортируем дочерние компоненты напрямую ★★★
import Header from './header.jsx';
// Мы не знаем, какой будет контент, поэтому его оставим динамическим
// (но теперь его будет передавать родительский компонент, а не движок)

export default function MainLayout(props) {
  // Извлекаем КОМПОНЕНТ контента страницы, который передается через props.
  // Это стандартный паттерн в React, называемый "composition".
  const { pageContent: PageComponent } = props.components || {};

  return (
    <>
      <div id="header-container">
        {/* Header теперь не зависит от "инъекции", он просто рендерится */}
        <Header {...props} />
      </div>
      <main id="pageContent-container">
        {/* А контент страницы рендерится как дочерний элемент */}
        {PageComponent && <PageComponent {...props} />}
      </main>
    </>
  );
}