// packages/example-app/seed.js
// Это отдельный Node.js скрипт для первоначального наполнения базы данных.
// Он не является частью самого движка, а запускается вручную командой `npm run seed`.

const path = require('path');
const WiseJSON = require('wise-json-db/wise-json');
const bcrypt = require('bcrypt');

// Путь к нашей базе данных.
const DB_PATH = path.resolve(__dirname, 'axle-db-data');

// Начальные данные.
const initialPositions = [
    { "id": 1, "name": "Хлеб Бородинский", "price": 45.50 },
    { "id": 2, "name": "Молоко 3.2%", "price": 80.00 },
    { "id": 3, "name": "Сыр Российский", "price": 250.75 },
    { "id": 4, "name": "Кефир 1%", "price": 75.00 },
    { "id": 5, "name": "Масло сливочное", "price": 180.00 }
];

const defaultUser = {
  login: 'kassir',
  password: '123', // Мы захэшируем его перед сохранением.
  name: "Иванов И.И.",
  role: "Кассир"
};

/**
 * Главная асинхронная функция для наполнения БД.
 */
async function seedDatabase() {
    console.log(`🌱 Запускаем наполнение базы данных в: ${DB_PATH}`);
    const db = new WiseJSON(DB_PATH);
    
    try {
        await db.init();
        console.log("✅ База данных успешно инициализирована.");

        // 1. Наполняем коллекцию товаров.
        const positionsCol = await db.getCollection('positions');
        await positionsCol.clear();
        await positionsCol.insertMany(initialPositions);
        console.log(`✅ Коллекция "positions" наполнена ${initialPositions.length} товарами.`);

        // 2. Создаем пользователя по умолчанию.
        const userCol = await db.getCollection('user');
        await userCol.clear();
        
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(defaultUser.password, saltRounds);
        
        const userData = {
            _id: 'user_kassir_default', // Добавляем предсказуемый ID
            login: defaultUser.login,
            passwordHash: passwordHash,
            name: defaultUser.name,
            role: defaultUser.role
        };
        await userCol.insert(userData);
        console.log(`✅ Пользователь "${defaultUser.login}" создан с паролем "${defaultUser.password}".`);

        // 3. Очищаем "динамические" коллекции.
        await db.getCollection('sessions').then(col => col.clear());
        console.log(`✅ Коллекция "sessions" очищена.`);
        
        await db.getCollection('receipt').then(col => col.clear());
        console.log(`✅ Коллекция "receipt" очищена.`);

    } catch (error) {
        console.error('🔥 Ошибка во время наполнения базы:', error);
    } finally {
        await db.close();
        console.log('✨ Наполнение завершено.');
    }
}

// Запускаем наш скрипт.
seedDatabase();