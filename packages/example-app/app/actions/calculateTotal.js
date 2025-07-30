// packages/example-app/app/actions/calculateTotal.js
// Это "чистая функция", которая не знает о контексте.
// Она просто принимает массив товаров и возвращает их общую стоимость.
module.exports = (items = []) => {
  const total = items.reduce((sum, item) => {
    const price = parseFloat(item.price || 0);
    const quantity = Number(item.quantity || 0);
    return sum + (price * quantity);
  }, 0);
  return total.toFixed(2);
};