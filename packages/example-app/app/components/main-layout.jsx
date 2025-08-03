// packages/example-app/app/components/main-layout.jsx
import React from 'react';

/**
 * The main layout component for the application.
 * It receives other rendered components as props from the renderer.
 * @param {object} props
 * @param {React.ReactNode} props.header - The header component.
 * @param {React.ReactNode} props.pageContent - The main page content component.
 */
export default function MainLayout({ header, pageContent }) {
  return (
    <>
      <div id="header-container">
        {header}
      </div>
      <main id="pageContent-container">
        {pageContent}
      </main>
    </>
  );
}