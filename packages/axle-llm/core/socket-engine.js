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
    
    this.clients = new Map();
    this.channels = new Map();
    // ★★★ НОВОЕ ХРАНИЛИЩЕ ДЛЯ ОЖИДАЮЩИХ ВЫЗОВОВ ★★★
    this.pendingBridgeCalls = new Map();

    this.wss = new WebSocket.Server({ server: httpServer });

    this._initializeChannels();

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
        subscribers: new Set()
      });
      console.log(`[SocketEngine] -> Channel '${channelName}' registered.`);
    }
  }

  /**
   * Обрабатывает новое WebSocket-подключение.
   * @private
   */
  _handleConnection(ws) {
    const clientId = crypto.randomBytes(16).toString('hex');
    this.clients.set(clientId, ws);
    console.log(`[SocketEngine] Client connected with ID: ${clientId}`);

    ws.send(JSON.stringify({ type: 'socket_id_assigned', id: clientId }));

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        if (data.type === 'subscribe' && this.channels.has(data.channel)) {
          this.channels.get(data.channel).subscribers.add(clientId);
          console.log(`[SocketEngine] Client ${clientId} subscribed to channel '${data.channel}'`);
        } 
        // ★★★ НАЧАЛО НОВОЙ ЛОГИКИ ★★★
        // Клиент присылает результат выполнения bridge call
        else if (data.type === 'bridge_call_response') {
          const { callId, result } = data.payload;
          if (this.pendingBridgeCalls.has(callId)) {
            const { resolve } = this.pendingBridgeCalls.get(callId);
            // Вызываем сохраненный resolve, чтобы "разбудить" action
            resolve(result);
            this.pendingBridgeCalls.delete(callId);
          }
        }
        // ★★★ КОНЕЦ НОВОЙ ЛОГИКИ ★★★
      } catch (e) {
        console.warn(`[SocketEngine] Received invalid message from client ${clientId}:`, message);
      }
    });

    ws.on('close', () => {
      console.log(`[SocketEngine] Client ${clientId} disconnected.`);
      this.clients.delete(clientId);
      this.channels.forEach(channel => {
        channel.subscribers.delete(clientId);
      });
      // Важно "отменить" все ожидающие вызовы от этого клиента, чтобы избежать утечек памяти
      this.pendingBridgeCalls.forEach((call, callId) => {
        if (call.clientId === clientId) {
          call.reject(new Error('Client disconnected during bridge call.'));
          this.pendingBridgeCalls.delete(callId);
        }
      });
    });

    ws.on('error', (error) => {
      console.error(`[SocketEngine] WebSocket error for client ${clientId}:`, error);
    });
  }
  
  // ★★★ НАЧАЛО НОВОГО ПУБЛИЧНОГО МЕТОДА ★★★
  /**
   * Отправляет команду на клиентский мост и возвращает Promise, который разрешится с ответом клиента.
   * @param {string} clientId - ID клиента, которому нужно отправить команду.
   * @param {object} callDetails - Объект с деталями вызова (api, args).
   * @returns {Promise<any>}
   */
  awaitableBridgeCall(clientId, callDetails) {
    return new Promise((resolve, reject) => {
      const ws = this.clients.get(clientId);
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        return reject(new Error('Client is not connected.'));
      }

      const callId = crypto.randomBytes(16).toString('hex');
      this.pendingBridgeCalls.set(callId, { resolve, reject, clientId });
      
      // Устанавливаем таймаут, чтобы action не "висел" вечно
      setTimeout(() => {
        if (this.pendingBridgeCalls.has(callId)) {
          this.pendingBridgeCalls.delete(callId);
          reject(new Error(`Bridge call timed out after 30 seconds.`));
        }
      }, 30000);

      ws.send(JSON.stringify({
        type: 'awaitable_bridge_call',
        payload: { callId, ...callDetails }
      }));
    });
  }
  // ★★★ КОНЕЦ НОВОГО ПУБЛИЧНОГО МЕТОДА ★★★

  /**
   * Публичный метод, который вызывается `RequestHandler`'ом после записи данных.
   * Он проверяет, нужно ли отправить уведомление, и рассылает его.
   * @param {string} connectorName - Имя коннектора, в который были записаны данные.
   * @param {string|null} initiatorId - ID клиента, который инициировал изменение.
   */
  async notifyOnWrite(connectorName, initiatorId = null) {
    for (const [channelName, channel] of this.channels.entries()) {
      if (channel.config.watch === connectorName) {
        const connectorData = await this.connectorManager.getConnector(connectorName).read();
        const message = JSON.stringify({
          event: channel.config.emit.event,
          payload: connectorData
        });
        console.log(`[SocketEngine] Broadcasting on channel '${channelName}' due to write on '${connectorName}'.`);
        channel.subscribers.forEach(subscriberId => {
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