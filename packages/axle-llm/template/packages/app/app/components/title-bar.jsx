// packages/app/app/components/title-bar.jsx
import React from 'react';

export default function TitleBar(props) {
  // Стили для контейнеров остаются инлайновыми, так как они определяют структуру
  const titleBarStyle = {
    height: '32px',
    backgroundColor: '#ffffff',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 4px 0 10px',
    borderBottom: '1px solid var(--border-color, #dee2e6)',
    WebkitAppRegion: 'drag'
  };
  const titleWrapStyle = { display: 'flex', alignItems: 'center', gap: '8px' };
  const iconStyle = { height: '20px', width: '20px' };
  const titleStyle = { fontSize: '0.8rem', color: '#6c757d', margin: 0, padding: 0 };
  const buttonGroupStyle = { display: 'flex', WebkitAppRegion: 'no-drag' };

  return (
    <div style={titleBarStyle}>
      <div style={titleWrapStyle}>
        <img src="/public/icon.png" alt="App Icon" style={iconStyle} />
        <p style={titleStyle}>{props.globals?.appName || 'App'}</p>
      </div>
      <div style={buttonGroupStyle}>
        {/* ★★★ КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ: Используем className вместо style ★★★ */}
        <button className="window-control-button" title="Minimize" atom-action="POST /action/window/minimize">
          &minus;
        </button>
        <button className="window-control-button" title="Maximize" atom-action="POST /action/window/maximize">
          &#9634;
        </button>
        <button className="window-control-button close" title="Close" atom-action="POST /action/window/close">
          &times;
        </button>
      </div>
    </div>
  );
}