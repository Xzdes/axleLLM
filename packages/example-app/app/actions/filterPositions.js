// packages/example-app/app/actions/filterPositions.js
// Этот JS-файл выполняется на сервере как часть `run`-шага.
// Он получает полный `context` и может его напрямую изменять.

module.exports = (context, body) => {
  // Извлекаем нужные нам коннекторы из контекста.
  const { positions, viewState } = context.data;
  
  // Получаем поисковый запрос из тела запроса,
  // приводим его к нижнему регистру и убираем пробелы по краям.
  const query = (body.query || '').toLowerCase().trim();

  // 1. Сохраняем текущий текст из инпута обратно в `viewState`.
  //    Это нужно, чтобы после перерисовки в инпуте остался введенный текст.
  viewState.query = body.query;

  const sourceArray = positions.items || [];

  // 2. Выполняем саму логику фильтрации.
  if (!query) {
    // Если запрос пустой, то в "отфильтрованный" массив мы кладем все товары.
    viewState.filtered = sourceArray;
  } else {
    // Если запрос есть, фильтруем исходный массив.
    viewState.filtered = sourceArray.filter(item => 
      // Проверяем, что у товара есть имя, и оно включает в себя текст запроса.
      item.name && item.name.toLowerCase().includes(query)
    );
  }
};