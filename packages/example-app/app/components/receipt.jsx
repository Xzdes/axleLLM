// packages/example-app/app/components/receipt.jsx
import React from 'react';

/**
 * Renders a single item within the receipt.
 */
function ReceiptItem({ item }) {
  return (
    <li>
      <span>{item.name} ({item.price}р x {item.quantity})</span>
      <button 
        className="remove-btn"
        type="button"
        atom-action="POST /action/removeItem"
        atom-target="#pageContent-container" // ★★★ ИЗМЕНЕНО ★★★
        name="id"
        value={item.id}
      >
        ×
      </button>
    </li>
  );
}

/**
 * Displays the current state of the receipt, including items, totals, and actions.
 * @param {object} props
 * @param {object} props.data - The data context from connectors.
 * @param {object} props.data.receipt - The 'receipt' connector data.
 */
export default function Receipt({ data }) {
  const { receipt } = data;
  const hasItems = receipt.items && receipt.items.length > 0;

  return (
    <div
      atom-socket="receipt-updates"
      atom-on-event="receipt-changed"
      atom-action="POST /action/soft-refresh-receipt"
      atom-target="#pageContent-container" // ★★★ ИЗМЕНЕНО ★★★
    >
      <h3>Чек</h3>
      
      {receipt.statusMessage && (
        <p className="status-message">
          {receipt.statusMessage}
        </p>
      )}

      {hasItems ? (
        <ul className="receipt-items">
          {receipt.items.map(item => <ReceiptItem key={item.id} item={item} />)}
        </ul>
      ) : (
        <div className="empty-state">
          <p>Чек пуст</p>
          <span>Добавьте товары из списка слева.</span>
        </div>
      )}
      
      <hr />
      
      <div className="totals">
        <p><span>Позиций:</span> <span>{receipt.itemCount || 0} шт.</span></p>
        <p><span>Сумма:</span> <span>{receipt.total || '0.00'} руб.</span></p>
        <p className="discount"><span>Скидка ({receipt.discountPercent || 0}%):</span> <span>-{receipt.discount || '0.00'} руб.</span></p>
        <p className="final-total"><b>Итого:</b> <b>{receipt.finalTotal || '0.00'} руб.</b></p>
      </div>

      <form className="coupon-form" atom-action="POST /action/applyCoupon" atom-target="#pageContent-container"> {/* ★★★ ИЗМЕНЕНО ★★★ */}
        <input type="text" name="coupon_code" placeholder="Промокод" />
        <button type="submit" className="action-button">Применить</button>
      </form>

      <button 
        id="clear-btn"
        type="button"
        className="action-button danger"
        atom-action="POST /action/clearReceipt"
        atom-target="#pageContent-container" // ★★★ ИЗМЕНЕНО ★★★
      >
        Очистить чек
      </button>
      
      <button 
        type="button"
        className="action-button"
        style={{ marginTop: '10px', backgroundColor: '#e6f7ff' }}
        atom-action="GET /action/showInfo"
      >
        Показать инфо (Тест Моста)
      </button>

      <button 
        type="button"
        className="action-button"
        style={{ marginTop: '10px' }}
        atom-action="GET /action/open-file"
      >
        Прикрепить файл...
      </button>

      <button 
        type="button"
        className="action-button"
        style={{ marginTop: '10px' }}
        atom-action="POST /action/saveReceipt"
      >
        Сохранить чек в файл
      </button>
    </div>
  );
}