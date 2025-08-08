// packages/axle-llm/core/auth-engine.js

const crypto = require('crypto');
const cookie = require('cookie');

class AuthEngine {
  constructor(manifest, connectorManager) {
    this.config = manifest.auth;
    this.connectorManager = connectorManager;

    this.userConnector = null;
    this.sessionConnector = null;
    // ★★★ ИСПРАВЛЕНИЕ: Будем хранить прямые ссылки на коллекции БД для производительности ★★★
    this.userCollection = null;
    this.sessionCollection = null;
  }

  async init() {
    if (!this.config) {
      throw new Error("[AuthEngine] 'auth' section is missing in manifest.js.");
    }
    const userConnectorName = this.config.userConnector;
    if (!userConnectorName) {
      throw new Error("[AuthEngine] 'userConnector' is not defined in the 'auth' section.");
    }
    
    this.userConnector = this.connectorManager.getConnector(userConnectorName);
    this.sessionConnector = this.connectorManager.getConnector('session');

    if (!this.userConnector || !this.sessionConnector) {
      throw new Error("[AuthEngine] Could not retrieve user or session connectors.");
    }
    
    // ★★★ ИСПРАВЛЕНИЕ: Получаем и сохраняем экземпляры коллекций ★★★
    // `wise-json-db` имеет свой собственный кэш, и работа с коллекцией напрямую надежнее.
    await this.userConnector.initPromise;
    await this.sessionConnector.initPromise;
    this.userCollection = this.userConnector.collection;
    this.sessionCollection = this.sessionConnector.collection;
  }

  async getUserFromRequest(req) {
    const cookies = cookie.parse(req.headers.cookie || '');
    const sessionId = cookies.session_id;

    if (!sessionId) {
      return null;
    }

    // ★★★ ИСПРАВЛЕНИЕ: Используем прямой поиск по ID, это гораздо эффективнее, чем читать всю коллекцию ★★★
    const sessionData = await this.sessionCollection.getById(sessionId);

    if (!sessionData || !sessionData.userId) {
      return null;
    }
    
    // ★★★ ИСПРАВЛЕНИЕ: Используем прямой поиск по ID пользователя ★★★
    const user = await this.userCollection.getById(sessionData.userId);

    return user || null;
  }

  async createSessionCookie(user) {
    if (!user || !user._id) {
      throw new Error("[AuthEngine] Cannot create session for invalid user object.");
    }
    
    const sessionId = crypto.randomBytes(32).toString('hex');
    const sessionData = {
      _id: sessionId,
      userId: user._id,
      createdAt: new Date().toISOString()
    };
    
    // ★★★ ИСПРАВЛЕНИЕ: Используем метод `insert` для добавления одной записи ★★★
    await this.sessionCollection.insert(sessionData);

    return cookie.serialize('session_id', sessionId, {
      httpOnly: true,
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 дней
      sameSite: 'lax'
    });
  }

  async clearSessionCookie(req) {
    const cookies = cookie.parse(req.headers.cookie || '');
    const sessionId = cookies.session_id;

    if (sessionId) {
      // ★★★ ИСПРАВЛЕНИЕ: Используем метод `remove` для удаления одной записи ★★★
      await this.sessionCollection.remove(sessionId);
    }

    return cookie.serialize('session_id', '', {
      httpOnly: true,
      path: '/',
      maxAge: -1 // Удаляем куки
    });
  }

  redirect(res, location) {
    if (res.headersSent) return;
    res.writeHead(302, { 'Location': location });
    res.end();
  }
}

module.exports = {
  AuthEngine,
};