// packages/example-app/app/components/auth-layout.jsx
import React from 'react';

export default function AuthLayout(props) {
  // ★★★ ИСПРАВЛЕНИЕ: Извлекаем из props.components ★★★
  // Этот макет должен рендерить конкретную форму (login-form или register-form)
  const { formContent: FormComponent } = props.components || {};

  return (
    <div className="auth-page-wrapper">
      <div className="auth-card">
        {/* Рендерим переданную форму */}
        {FormComponent && <FormComponent {...props} />}
      </div>
    </div>
  );
}