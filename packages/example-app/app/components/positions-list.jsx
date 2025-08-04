// packages/example-app/app/components/positionsList.jsx
import React from 'react';

/**
 * Renders a single item in the positions list.
 */
function PositionItem({ item }) {
  return (
    <li>
      <span>{item.name} ({item.price} руб.)</span>
      <button
        type="button"
        atom-action="POST /action/addItem"
        atom-target="#pageContent-container" // ★★★ ИЗМЕНЕНО ★★★
        name="id"
        value={item.id}
      >
        Добавить
      </button>
    </li>
  );
}

/**
 * Displays the list of all available products and a search bar to filter them.
 * @param {object} props
 * @param {object} props.data - The data context from connectors.
 * @param {object} props.data.positions - The 'positions' connector data.
 * @param {Array<object>} props.data.positions.items - The list of all products.
 * @param {object} props.data.viewState - The 'viewState' connector data.
 * @param {string} props.data.viewState.query - The current search query.
 * @param {Array<object>} props.data.viewState.filtered - The filtered list of products.
 */
export default function PositionsList({ data }) {
  const { positions, viewState } = data;
  
  // Determine which list of items to display
  const hasQuery = viewState.query && viewState.query.length > 0;
  const itemsToDisplay = hasQuery ? viewState.filtered : positions.items;

  return (
    <div>
      <h3>Товары</h3>

      <div className="search-bar">
        <input 
          id="search-input"
          type="text" 
          name="query" 
          placeholder="Найти товар..." 
          defaultValue={viewState.query} // Use defaultValue for uncontrolled components
          atom-action="POST /action/filterPositions"  
          atom-target="#pageContent-container" // ★★★ ИЗМЕНЕНО ★★★
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