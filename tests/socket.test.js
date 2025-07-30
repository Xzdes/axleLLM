// tests/socket.test.js
const path = require('path');
const http = require('http');
const WebSocket = require('ws');
const { createServerInstance } = require('../packages/axle-llm/core/server');

function log(message, data) {
    console.log(`\n[LOG] ${message}`);
    if (data !== undefined) {
        const replacer = (key, value) => typeof value === 'bigint' ? value.toString() : value;
        console.log(JSON.stringify(data, replacer, 2));
    }
}
function check(condition, description, actual) {
    if (condition) {
        console.log(`  ✅ OK: ${description}`);
    } else {
        console.error(`  ❌ FAILED: ${description}`);
        if (actual !== undefined) console.error('     ACTUAL VALUE:', actual);
        throw new Error(`Assertion failed: ${description}`);
    }
}

module.exports = {
    'SocketEngine: Should broadcast changes to subscribed clients': {
        options: {
            manifest: {
                launch: {},
                sockets: {
                    "cart-updates": {
                      "watch": "cart",
                      "emit": { "event": "cart_updated", "payload": "cart" }
                    }
                },
                connectors: {
                    cart: { type: 'in-memory', initialState: { items: [] } }
                },
                components: {},
                routes: {
                    'POST /action/addItem': {
                        type: 'action',
                        reads: ['cart'],
                        writes: ['cart'],
                        steps: [
                            { "set": "data.cart.items", "to": "data.cart.items.concat([body.item])" }
                        ]
                    }
                }
            }
        },
        async run(appPath) {
            let server;
            let ws1, ws2;
            const PORT = 5004; // Используем другой порт для надежности

            try {
                log('Starting a temporary axleLLM server...');
                const manifest = require(path.join(appPath, 'manifest.js'));
                const { httpServer } = await createServerInstance(appPath, manifest);
                server = httpServer;
                
                // Запускаем сервер на прослушивание порта
                await new Promise(resolve => server.listen(PORT, resolve));
                
                const receivedMessages = [];
                const createClient = (url) => {
                    return new Promise((resolve, reject) => {
                        const ws = new WebSocket(url);
                        ws.on('message', (message) => {
                            const parsed = JSON.parse(message.toString());
                            if (ws.id) { receivedMessages.push({ clientId: ws.id, ...parsed }); }
                            if (parsed.type === 'socket_id_assigned') { ws.id = parsed.id; resolve(ws); }
                        });
                        ws.on('error', reject);
                    });
                };

                log('Connecting WebSocket clients...');
                [ws1, ws2] = await Promise.all([ createClient(`ws://localhost:${PORT}`), createClient(`ws://localhost:${PORT}`) ]);
                log(`Clients initialized with IDs: ws1=${ws1.id}, ws2=${ws2.id}`);
                
                log(`Subscribing client ws1 (${ws1.id}) to "cart-updates"...`);
                ws1.send(JSON.stringify({ type: 'subscribe', channel: 'cart-updates' }));
                await new Promise(resolve => setTimeout(resolve, 50));
                
                log('Simulating HTTP request from ws2 to trigger an action...');
                const postData = JSON.stringify({ item: 'milk' });
                const options = { hostname: 'localhost', port: PORT, path: '/action/addItem', method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Socket-Id': ws2.id } };
                
                await new Promise((resolve, reject) => {
                    const req = http.request(options, res => { res.on('data', () => {}); res.on('end', resolve); });
                    req.on('error', reject);
                    req.write(postData);
                    req.end();
                });
                
                log('HTTP request finished. Waiting for broadcast...');
                await new Promise(resolve => setTimeout(resolve, 200));
                
                log('Checking received messages...');
                const messagesForWs1 = receivedMessages.filter(m => m.clientId === ws1.id);
                log(`Messages for ws1 (${ws1.id}):`, messagesForWs1);
                
                const cartChangedMessage = messagesForWs1.find(m => m.event === 'cart_updated');
                check(cartChangedMessage, 'Client ws1 (observer) should have received the "cart_updated" event.');
                if (cartChangedMessage) { check(cartChangedMessage.payload.items[0] === 'milk', 'The payload should be correct.'); }
                
                const messagesForWs2 = receivedMessages.filter(m => m.clientId === ws2.id);
                const cartChangedMessageForInitiator = messagesForWs2.find(m => m.event === 'cart_updated');
                check(!cartChangedMessageForInitiator, 'Client ws2 (initiator) should NOT have received the event.');

            } finally {
                log('Cleaning up...');
                if (ws1) ws1.close();
                if (ws2) ws2.close();
                if (server) await new Promise(resolve => server.close(resolve));
            }
        }
    },
};