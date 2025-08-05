// packages/example-app/seed.js
const path = require('path');
const WiseJSON = require('wise-json-db/wise-json');
// ★★★ НАПОРИСТОЕ ИСПРАВЛЕНИЕ: ИСПОЛЬЗУЕМ НОВУЮ БИБЛИОТЕКУ ★★★
const bcrypt = require('bcryptjs');

const DB_PATH = path.resolve(__dirname, 'axle-db-data');

const initialPositions = [
    { "id": 1, "name": "Хлеб Бородинский", "price": 45.50 },
    { "id": 2, "name": "Молоко 3.2%", "price": 80.00 },
    { "id": 3, "name": "Сыр Российский", "price": 250.75 },
    { "id": 4, "name": "Кефир 1%", "price": 75.00 },
    { "id": 5, "name": "Масло сливочное", "price": 180.00 }
];

const defaultUser = {
  login: 'kassir',
  password: '123',
  name: "Иванов И.И.",
  role: "Кассир"
};

async function seedDatabase() {
    console.log(`🌱 Запускаем наполнение базы данных в: ${DB_PATH}`);
    const db = new WiseJSON(DB_PATH);
    
    try {
        await db.init();
        console.log("✅ База данных успешно инициализирована.");

        const positionsCol = await db.getCollection('positions');
        await positionsCol.clear();
        await positionsCol.insertMany(initialPositions);
        console.log(`✅ Коллекция "positions" наполнена ${initialPositions.length} товарами.`);

        const userCol = await db.getCollection('user');
        await userCol.clear();
        
        const saltRounds = 10;
        // ★★★ НАПОРИСТОЕ ИСПРАВЛЕНИЕ: Используем СИНХРОННЫЙ метод, он проще и надежнее ★★★
        const passwordHash = bcrypt.hashSync(defaultUser.password, saltRounds);
        
        const userData = {
            _id: 'user_kassir_default',
            login: defaultUser.login,
            passwordHash: passwordHash,
            name: defaultUser.name,
            role: defaultUser.role
        };
        await userCol.insert(userData);
        console.log(`✅ Пользователь "${defaultUser.login}" создан с паролем "${defaultUser.password}".`);

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

seedDatabase();