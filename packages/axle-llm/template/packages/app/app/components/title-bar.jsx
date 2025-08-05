import React from 'react';
export default function TitleBar({ globals }) {
  const titleBarStyle = { height: '32px', backgroundColor: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px 0 10px', borderBottom: '1px solid var(--border-color)', WebkitAppRegion: 'drag' };
  const titleWrapStyle = { display: 'flex', alignItems: 'center', gap: '8px' };
  const iconStyle = { height: '20px', width: '20px' };
  const titleStyle = { fontSize: '0.8rem', color: '#6c757d', margin: 0, padding: 0 };
  const buttonGroupStyle = { display: 'flex', WebkitAppRegion: 'no-drag' };
  const buttonStyle = { width: '32px', height: '32px', border: 'none', backgroundColor: 'transparent', color: '#495057', fontSize: '1.2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' };
  return (
    <div style={titleBarStyle}>
      <div style={titleWrapStyle}>
        <img src="/public/icon.png" alt="App Icon" style={iconStyle} />
        <p style={titleStyle}>{globals?.appName || 'App'}</p>
      </div>
      <div style={buttonGroupStyle}>
        <button style={buttonStyle} title="Minimize" atom-action="POST /action/window/minimize"> &minus; </button>
        <button style={buttonStyle} title="Maximize" atom-action="POST /action/window/maximize"> &#9634; </button>
        <button style={{...buttonStyle, ':hover': {backgroundColor: '#dc3545'}}} title="Close" atom-action="POST /action/window/close"> &times; </button>
      </div>
    </div>
  );
}