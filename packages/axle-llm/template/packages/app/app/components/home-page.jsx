// packages/axle-llm/template/packages/app/app/components/home-page.jsx
import React from 'react';

export default function HomePage({ data }) {
  const message = data.viewState?.message || 'Message not found.';

  return (
    <div className="home-page-container">
      <h1>{message}</h1>
      <p>
        This is a native desktop application powered by the AxleLLM engine.
      </p>
      
      <button
        atom-action="POST /action/change-message"
        // ★★★ КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ: Обновление теперь нацелено на #root ★★★
        atom-target="#root"
      >
        Click Me to Change the Message
      </button>
    </div>
  );
}