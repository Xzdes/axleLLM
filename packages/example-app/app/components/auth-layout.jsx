// packages/example-app/app/components/auth-layout.jsx
import React from 'react';

export default function AuthLayout(props) {
  // ★★★ ИСПРАВЛЕНИЕ ★★★
  // Этот макет должен рендерить не PageComponent, а конкретную форму,
  // которую мы передаем через `inject` в маршруте.
  const { formContent: FormComponent } = props.components;

  return (
    <div className="auth-page-wrapper">
      <div className="auth-card">
        {/* Рендерим переданную форму (login-form или register-form) */}
        {FormComponent && <FormComponent {...props} />}
      </div>
    </div>
  );
}