// packages/example-app/app/components/cashier-page.jsx
import React from 'react';

/**
 * The main page for the cashier.
 * This component acts as a layout container for the positions list and the receipt.
 * @param {object} props
 * @param {React.ReactNode} props.positionsList - The PositionsList component.
 * @param {React.ReactNode} props.receipt - The Receipt component.
 */
export default function CashierPage({ positionsList, receipt }) {
  return (
    <div className="cashier-page-wrapper">
      <div id="positionsList-container">
        {positionsList}
      </div>
      <div id="receipt-container">
        {receipt}
      </div>
    </div>
  );
}