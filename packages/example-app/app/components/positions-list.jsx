// packages/example-app/app/components/positions-list.jsx
import React from 'react';

function PositionItem({ item }) {
  return (
    <li>
      <span>{item.name} ({item.price} руб.)</span>
      <button
        type="button"
        atom-action="POST /action/addItem"
        atom-target="#receipt-container" // ★ ИЗМЕНЕНИЕ: эта кнопка должна обновлять чек!
        name="id"
        value={item.id}
      >
        Добавить
      </button>
    </li>
  );
}

export default function PositionsList({ data }) {
  const { positions, viewState } = data;
  
  const hasQuery = viewState.query && viewState.query.length > 0;
  const itemsToDisplay = hasQuery ? viewState.filtered : positions.items;

  return (
    <div id="positionsList-container"> {/* ★ Добавляем ID для таргетинга */}
      <h3>Товары</h3>

      <div className="search-bar">
        <input 
          id="search-input"
          type="text" 
          name="query" 
          placeholder="Найти товар..." 
          defaultValue={viewState.query}
          atom-action="POST /action/filterPositions"  
          atom-target="#positionsList-container" // ★ ИЗМЕНЕНИЕ
          atom-event="input"
        />
      </div>

      <form>
        <ul>
          {itemsToDisplay && itemsToDisplay.length > 0 ? (
            itemsToDisplay.map(item => <PositionItem key={item.id} item={item} />)
          ) : (
            <li>
              <span>
                {hasQuery 
                  ? `По запросу "${viewState.query}" ничего не найдено.` 
                  : 'Список товаров пуст.'}
              </span>
            </li>
          )}
        </ul>
      </form>
    </div>
  );
}