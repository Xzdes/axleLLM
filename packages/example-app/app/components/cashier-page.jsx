// packages/example-app/app/components/cashier-page.jsx
import React from 'react';

// ★★★ НАПОРИСТОЕ ИЗМЕНЕНИЕ: Мы импортируем дочерние компоненты напрямую ★★★
// Компонент "касса" всегда содержит список товаров и чек.
import PositionsList from './positions-list.jsx';
import Receipt from './receipt.jsx';

export default function CashierPage(props) {
  // Теперь нам не нужно ничего извлекать из props.components.
  // Композиция определена здесь, статически и надежно.

  return (
    <div className="cashier-page-wrapper">
      <div id="positionsList-container">
        <PositionsList {...props} />
      </div>
      <div id="receipt-container">
        <Receipt {...props} />
      </div>
    </div>
  );
}