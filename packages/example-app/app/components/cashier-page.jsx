// packages/example-app/app/components/cashier-page.jsx
import React from 'react';

export default function CashierPage(props) {
  // ★★★ ИСПРАВЛЕНИЕ ★★★
  // Извлекаем компоненты из props.components
  const { positionsList: PositionsListComponent, receipt: ReceiptComponent } = props.components;

  return (
    <div className="cashier-page-wrapper">
      <div id="positionsList-container">
        {PositionsListComponent && <PositionsListComponent {...props} />}
      </div>
      <div id="receipt-container">
        {ReceiptComponent && <ReceiptComponent {...props} />}
      </div>
    </div>
  );
}