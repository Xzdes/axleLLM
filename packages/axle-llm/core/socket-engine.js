// packages/axle-llm/core/socket-engine.js
const WebSocket = require('ws');
const crypto = require('crypto');

class SocketEngine {
    constructor(httpServer, manifest, connectorManager) {
        this.manifest = manifest;
        this.connectorManager = connectorManager;
        this.clients = new Map();
        this.channels = new Map();
        
        // Хранилище для "продолжений" (функций, которые нужно выполнить после ответа клиента)
        this.pendingAwaits = new Map();

        this.wss = new WebSocket.Server({ server: httpServer });
        this._initializeChannels();
        this.wss.on('connection', (ws) => this._handleConnection(ws));
        console.log('[SocketEngine] WebSocket server initialized and is listening for connections.');
    }

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

    sendToClient(clientId, message) {
        const client = this.clients.get(clientId);
        if (client && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
        }
    }
    
    registerContinuation(clientId, callDetails, continuation) {
        return new Promise((resolve, reject) => {
            const ws = this.clients.get(clientId);
            if (!ws || ws.readyState !== WebSocket.OPEN) {
                return reject(new Error('Client for awaitable bridge call is not connected.'));
            }

            const callId = crypto.randomBytes(16).toString('hex');
            
            this.pendingAwaits.set(callId, {
                continuation: continuation,
                clientId: clientId
            });

            setTimeout(() => {
                if (this.pendingAwaits.has(callId)) {
                    this.pendingAwaits.delete(callId);
                    // Вместо reject, который уронит сервер, просто логируем
                    console.warn(`[SocketEngine] Awaitable call ${callId} timed out after 1 minute.`);
                }
            }, 60000);

            const httpResponsePayload = {
                awaitingBridgeCall: {
                    callId,
                    api: callDetails.api,
                    args: callDetails.args,
                }
            };
            
            resolve(httpResponsePayload);
        });
    }

    async _handleBridgeResponse(payload) {
        const { callId, result, error } = payload;
        const pending = this.pendingAwaits.get(callId);

        if (pending) {
            this.pendingAwaits.delete(callId);
            if (error) {
                console.error(`[SocketEngine] Client-side bridge call failed for callId ${callId}:`, error);
                // Можно добавить логику отката/уведомления об ошибке
                return;
            }
            try {
                // Вызываем сохраненное продолжение с результатом от клиента
                await pending.continuation(result);
            } catch(e) {
                console.error(`[SocketEngine] Error executing continuation for callId ${callId}:`, e);
            }
        }
    }

    _handleConnection(ws) {
        const clientId = crypto.randomBytes(16).toString('hex');
        this.clients.set(clientId, ws);
        
        ws.send(JSON.stringify({ type: 'socket_id_assigned', id: clientId }));

        ws.on('message', (message) => {
            try {
                const data = JSON.parse(message.toString());
                if (data.type === 'subscribe' && this.channels.has(data.channel)) {
                    this.channels.get(data.channel).subscribers.add(clientId);
                } 
                else if (data.type === 'bridge_call_response') {
                    this._handleBridgeResponse(data.payload);
                }
              } catch (e) {
                console.warn(`[SocketEngine] Received invalid message from client ${clientId}:`, message.toString());
            }
        });

        ws.on('close', () => {
            this.clients.delete(clientId);
            this.channels.forEach(channel => channel.subscribers.delete(clientId));
            this.pendingAwaits.forEach((pending, callId) => {
                if (pending.clientId === clientId) {
                    this.pendingAwaits.delete(callId);
                }
            });
        });

        ws.on('error', (error) => console.error(`[SocketEngine] WebSocket error for client ${clientId}:`, error));
    }

    async notifyOnWrite(connectorName, initiatorId = null) {
        for (const [channelName, channel] of this.channels.entries()) {
            if (channel.config.watch === connectorName) {
                const connectorData = await this.connectorManager.getConnector(connectorName).read();
                const message = JSON.stringify({
                    event: channel.config.emit.event,
                    payload: connectorData
                });
                channel.subscribers.forEach(subscriberId => {
                    // Не отправляем обновление тому, кто его инициировал, т.к. его UI уже обновлен.
                    if (subscriberId !== initiatorId) {
                        this.sendToClient(subscriberId, {
                            type: 'event', // Общий тип для событий
                            event: channel.config.emit.event,
                            payload: connectorData
                        });
                    }
                });
            }
        }
    }
}

module.exports = {
  SocketEngine,
};