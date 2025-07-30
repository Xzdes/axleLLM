// packages/example-app/app/actions/calculateFinalTotal.js
// Еще одна "чистая функция". Принимает общую сумму и процент скидки,
// возвращает итоговую сумму, скидку в рублях и отформатированную итоговую сумму.
module.exports = (total, discountPercent = 0) => {
  const totalNum = parseFloat(total);
  const discountNum = parseFloat(discountPercent);

  const discountAmount = totalNum * (discountNum / 100);
  const finalTotal = totalNum - discountAmount;

  return {
    discount: discountAmount.toFixed(2),
    finalTotal: finalTotal.toFixed(2)
  };
};