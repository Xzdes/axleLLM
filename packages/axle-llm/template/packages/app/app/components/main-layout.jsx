import React from 'react';
import TitleBar from './title-bar.jsx';
export default function MainLayout(props) {
  const { pageContent: PageComponent } = props.components || {};
  const showCustomTitleBar = props.globals?.useCustomTitleBar === true;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {showCustomTitleBar && <TitleBar {...props} />}
      <div id="page-content-wrapper" style={{ flexGrow: 1, minHeight: 0, position: 'relative' }}>
        {PageComponent && <PageComponent {...props} />}
      </div>
    </div>
  );
}