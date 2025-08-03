// packages/example-app/app/components/header.jsx
import React from 'react';

/**
 * The application header.
 * Displays the app name, a link to the documentation, and user info if available.
 * @param {object} props
 * @param {object} props.globals - Global variables from the manifest.
 * @param {object | null} props.user - The currently logged-in user object, or null.
 */
export default function Header({ globals, user }) {
  return (
    <header className="app-header">
      <h1>{globals.appName || 'AxleLLM App'}</h1>
      <div className="user-info">
        <a atom-action="GET /action/open-docs" style={{ cursor: 'pointer', marginRight: '15px' }}>
          Документация
        </a>
        {user && (
          <>
            <span>{user.name} ({user.role})</span>
            <a atom-action="GET /auth/logout" style={{ cursor: 'pointer' }}>
              Выход
            </a>
          </>
        )}
      </div>
    </header>
  );
}