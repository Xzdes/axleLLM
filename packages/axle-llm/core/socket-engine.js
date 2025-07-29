// Этот файл содержит класс SocketEngine.
// Он отвечает за всю real-time функциональность через WebSocket.
// Он управляет подключениями клиентов, подписками на каналы и рассылкой
// уведомлений при изменении данных в отслеживаемых коннекторах.

const WebSocket = require('ws');
const crypto = require('crypto');

class SocketEngine {
  /**
   * @param {http.Server} httpServer - Экземпляр HTTP-сервера, к которому нужно "привязаться".
   * @param {object} manifest - Объект манифеста.
   * @param {ConnectorManager} connectorManager - Экземпляр менеджера коннекторов.
   */
  constructor(httpServer, manifest, connectorManager) {
    this.manifest = manifest;
    this.connectorManager = connectorManager;
    
    // Хранилище для всех активных клиентов: { clientId -> WebSocket-соединение }
    this.clients = new Map();
    // Хранилище для каналов: { channelName -> { config, subscribers: Set<clientId> } }
    this.channels = new Map();

    // Создаем WebSocket-сервер поверх существующего HTTP-сервера.
    this.wss = new WebSocket.Server({ server: httpServer });

    // Инициализируем каналы на основе секции `sockets` в манифесте.
    this._initializeChannels();

    // Начинаем слушать новые подключения.
    this.wss.on('connection', (ws) => this._handleConnection(ws));
    
    console.log('[SocketEngine] WebSocket server initialized and is listening for connections.');
  }

  /**
   * Разбирает секцию `sockets` из манифеста и подготавливает каналы.
   * @private
   */
  _initializeChannels() {
    const socketsConfig = this.manifest.sockets || {};
    for (const channelName in socketsConfig) {
      this.channels.set(channelName, {
        config: socketsConfig[channelName],
        subscribers: new Set() // Используем Set для хранения уникальных ID подписчиков.
      });
      console.log(`[SocketEngine] -> Channel '${channelName}' registered.`);
    }
  }

  /**
   * Обрабатывает новое WebSocket-подключение.
   * @private
   */
  _handleConnection(ws) {
    // Генерируем уникальный ID для нового клиента.
    const clientId = crypto.randomBytes(16).toString('hex');
    this.clients.set(clientId, ws);
    console.log(`[SocketEngine] Client connected with ID: ${clientId}`);

    // ★ Важный шаг: сразу отправляем клиенту его ID.
    // Клиент будет использовать этот ID, чтобы сообщать, кто он, при отправке `action`-запросов.
    ws.send(JSON.stringify({ type: 'socket_id_assigned', id: clientId }));

    // Обработчик сообщений от этого конкретного клиента.
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        // Единственное сообщение, которое мы ждем от клиента - это подписка на канал.
        if (data.type === 'subscribe' && this.channels.has(data.channel)) {
          this.channels.get(data.channel).subscribers.add(clientId);
          console.log(`[SocketEngine] Client ${clientId} subscribed to channel '${data.channel}'`);
        }
      } catch (e) {
        console.warn(`[SocketEngine] Received invalid message from client ${clientId}:`, message);
      }
    });

    // Обработчик закрытия соединения.
    ws.on('close', () => {
      console.log(`[SocketEngine] Client ${clientId} disconnected.`);
      this.clients.delete(clientId);
      // Важно удалить клиента из всех каналов, на которые он был подписан.
      this.channels.forEach(channel => {
        channel.subscribers.delete(clientId);
      });
    });

    ws.on('error', (error) => {
      console.error(`[SocketEngine] WebSocket error for client ${clientId}:`, error);
    });
  }

  /**
   * Публичный метод, который вызывается `RequestHandler`'ом после записи данных.
   * Он проверяет, нужно ли отправить уведомление, и рассылает его.
   * @param {string} connectorName - Имя коннектора, в который были записаны данные.
   * @param {string|null} initiatorId - ID клиента, который инициировал изменение.
   */
  async notifyOnWrite(connectorName, initiatorId = null) {
    for (const [channelName, channel] of this.channels.entries()) {
      // Проверяем, следит ли этот канал за измененным коннектором.
      if (channel.config.watch === connectorName) {
        
        // Загружаем самые свежие данные, чтобы отправить их подписчикам.
        const connectorData = await this.connectorManager.getConnector(connectorName).read();
        
        const message = JSON.stringify({
          event: channel.config.emit.event,
          payload: connectorData
        });

        console.log(`[SocketEngine] Broadcasting on channel '${channelName}' due to write on '${connectorName}'. Initiator: ${initiatorId}`);
        
        // Рассылаем сообщение всем подписчикам этого канала.
        channel.subscribers.forEach(subscriberId => {
          // ★ Ключевая логика: НЕ отправляем уведомление обратно тому, кто его вызвал.
          if (subscriberId !== initiatorId) {
            const ws = this.clients.get(subscriberId);
            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.send(message);
            }
          }
        });
      }
    }
  }
}

module.exports = {
  SocketEngine,
};