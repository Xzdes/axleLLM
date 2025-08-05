// packages/app/app/components/home-page.jsx
import React from 'react';

/**
 * Компонент главной страницы.
 * @param {object} props
 * @param {object} props.data - Данные из коннекторов, определенных в `reads` роута.
 */
export default function HomePage({ data }) {
  // `data` содержит ключ `viewState`, потому что компонент
  // объявил эту зависимость в своей схеме в manifest/components.js.
  const message = data.viewState?.message || 'Message not found.';

  return (
    // Атрибут `atom-target` здесь не нужен, так как `update` в роуте
    // ссылается на этот компонент, и движок найдет его сам.
    <div className="home-page-container">
      <h1>{message}</h1>
      <p>
        This is a native desktop application powered by the AxleLLM engine.
      </p>
      
      {/*
        Эта кнопка - ключ к интерактивности.
        - `atom-action` говорит движку, какой `action`-роут вызвать.
        - `atom-target` говорит, какой DOM-элемент обновить после выполнения.
          Здесь мы обновляем контейнер всей страницы.
      */}
      <button
        atom-action="POST /action/change-message"
        atom-target="#pageContent-container"
      >
        Click Me to Change the Message
      </button>
    </div>
  );
}