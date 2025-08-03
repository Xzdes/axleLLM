// packages/example-app/app/components/login-form.jsx
import React from 'react';

/**
 * Renders the login form.
 * @param {object} props
 * @param {object} props.url - The URL context provided by the renderer.
 * @param {object} props.url.query - The parsed query string parameters.
 */
export default function LoginForm({ url }) {
  const query = url?.query || {};

  return (
    <div>
      <h2>Вход в систему</h2>
      
      {/* 
        This block will be rendered only if the URL contains "?registered=true".
        We use the logical AND (&&) operator for conditional rendering in JSX.
      */}
      {query.registered && (
        <p style={{ color: 'green', textAlign: 'center' }}>
          Регистрация прошла успешно! Теперь вы можете войти.
        </p>
      )}
      
      {/* 
        This block will be shown only if there is an "?error=1" in the URL.
      */}
      {query.error && (
        <p className="error">
          Неверный логин или пароль.
        </p>
      )}

      {/* 
        The atom-action attribute on the form triggers a 'submit' event.
        The client engine will intercept this, gather all form field data,
        and send it via an AJAX request.
      */}
      <form atom-action="POST /auth/login">
          <div className="form-group">
              <label htmlFor="login">Логин</label>
              <input type="text" id="login" name="login" required />
          </div>
          <div className="form-group">
              <label htmlFor="password">Пароль</label>
              <input type="password" id="password" name="password" required />
          </div>
          <div className="form-group">
              <button type="submit">Войти</button>
          </div>
      </form>
      
      <div className="links">
        {/*
          This link will perform a full page navigation for now,
          as client-side SPA routing is not yet implemented.
        */}
        <a href="/register">У меня еще нет аккаунта</a>
      </div>
    </div>
  );
}