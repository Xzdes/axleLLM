// packages/example-app/app/components/auth-layout.jsx
import React from 'react';

/**
 * A layout component that provides a centered card for authentication forms.
 * @param {object} props
 * @param {React.ReactNode} props.formContent - The actual form component (e.g., LoginForm).
 */
export default function AuthLayout({ formContent }) {
  return (
    <div className="auth-page-wrapper">
      <div className="auth-card">
        {formContent}
      </div>
    </div>
  );
}