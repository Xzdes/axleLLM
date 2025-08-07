// packages/example-app/app/components/cashier-page.jsx
import React from 'react';

// Этот компонент больше не импортирует PositionsList и Receipt.
// Он стал простым layout-компонентом для основного экрана.
// Он получает дочерние компоненты через props.components от движка.

export default function CashierPage(props) {
  // Извлекаем дочерние компоненты, которые движок "впрыснул" согласно `view`-роуту.
  // Имена (positionsList, receipt) должны совпадать с ключами в секции `inject` в роуте.
  const { positionsList: PositionsList, receipt: Receipt } = props.components || {};

  return (
    <div className="cashier-page-wrapper">
      <div id="positionsList-container">
        {/* Если компонент был инжектирован, рендерим его, передавая все props дальше */}
        {PositionsList && <PositionsList {...props} />}
      </div>
      <div id="receipt-container">
        {/* Аналогично для второго компонента */}
        {Receipt && <Receipt {...props} />}
      </div>
    </div>
  );
}