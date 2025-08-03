// packages/example-app/app/components/register-form.jsx
import React from 'react';

/**
 * Renders the user registration form.
 * @param {object} props
 * @param {object} props.url - The URL context provided by the renderer.
 * @param {object} props.url.query - The parsed query string parameters.
 */
export default function RegisterForm({ url }) {
  const query = url?.query || {};

  return (
    <div>
      <h2>Регистрация нового пользователя</h2>
      
      {query.error && (
        <p className="error">
          Этот логин уже занят или произошла ошибка.
        </p>
      )}

      <form atom-action="POST /auth/register">
          <div className="form-group">
              <label htmlFor="name">Ваше имя</label>
              <input type="text" id="name" name="name" required />
          </div>
          <div className="form-group">
              <label htmlFor="login">Логин</label>
              <input type="text" id="login" name="login" required />
          </div>
          <div className="form-group">
              <label htmlFor="password">Пароль</label>
              <input type="password" id="password" name="password" required />
          </div>
          <div className="form-group">
              <button type="submit">Зарегистрироваться</button>
          </div>
      </form>
      
      <div className="links">
        <a href="/login">У меня уже есть аккаунт</a>
      </div>
    </div>
  );
}