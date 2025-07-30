// packages/example-app/app/actions/formatReceiptForSave.js
// "Чистая функция" для форматирования данных чека в красивую строку.
module.exports = (receipt) => {
  let output = `===== ЧЕК =====\n`;
  output += `Дата: ${new Date().toLocaleString()}\n`;
  output += `=================\n\n`;

  if (!receipt.items || receipt.items.length === 0) {
    output += "Чек пуст.\n";
  } else {
    receipt.items.forEach(item => {
      const line = `${item.name} (${item.price}р x ${item.quantity})`.padEnd(40, ' ');
      const total = (item.price * item.quantity).toFixed(2);
      output += `${line} | ${total}р\n`;
    });
  }

  output += `\n=================\n`;
  output += `Позиций: ${receipt.itemCount} шт.\n`;
  output += `Сумма: ${receipt.total} руб.\n`;
  output += `Скидка (${receipt.discountPercent}%): -${receipt.discount} руб.\n`;
  output += `ИТОГО: ${receipt.finalTotal} руб.\n`;

  return output;
};