// packages/example-app/app/components/cashier-page.jsx
import React from 'react';

export default function CashierPage(props) {
  // Получаем ТИПЫ компонентов
  const { positionsList: PositionsListComponent, receipt: ReceiptComponent } = props;

  return (
    <div className="cashier-page-wrapper">
      <div id="positionsList-container">
        {/* Создаем элемент из типа, передавая ему ВСЕ props */}
        {PositionsListComponent && <PositionsListComponent {...props} />}
      </div>
      <div id="receipt-container">
        {/* Создаем элемент из типа, передавая ему ВСЕ props */}
        {ReceiptComponent && <ReceiptComponent {...props} />}
      </div>
    </div>
  );
}