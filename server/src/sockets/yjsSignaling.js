const { WebSocketServer } = require('ws');

const wsReadyStateConnecting = 0;
const wsReadyStateOpen = 1;

const pingTimeout = 30000;

/**
 * Initializes the Yjs signaling WebSocket server attached to an HTTP server.
 * This acts as a relay for y-webrtc peers to discover each other and exchange SDPs.
 * 
 * @param {import('http').Server} httpServer 
 */
function initYjsSignaling(httpServer) {
    // Bind to the same HTTP server on a specific path to run alongside Socket.IO
    const wss = new WebSocketServer({ server: httpServer, path: '/ywebrtc-signaling' });

    /**
     * Map from topic-name to set of subscribed clients.
     * @type {Map<string, Set<any>>}
     */
    const topics = new Map();

    const send = (conn, message) => {
        if (conn.readyState !== wsReadyStateConnecting && conn.readyState !== wsReadyStateOpen) {
            conn.close();
            return;
        }
        try {
            conn.send(JSON.stringify(message));
        } catch (e) {
            conn.close();
        }
    };

    wss.on('connection', (conn) => {
        const subscribedTopics = new Set();
        let closed = false;
        
        // Ping mechanism to keep connections alive and detect dropouts
        let pongReceived = true;
        const pingInterval = setInterval(() => {
            if (!pongReceived) {
                conn.close();
                clearInterval(pingInterval);
            } else {
                pongReceived = false;
                try {
                    conn.ping();
                } catch (e) {
                    conn.close();
                }
            }
        }, pingTimeout);

        conn.on('pong', () => {
            pongReceived = true;
        });

        conn.on('close', () => {
            subscribedTopics.forEach(topicName => {
                const subs = topics.get(topicName) || new Set();
                subs.delete(conn);
                if (subs.size === 0) {
                    topics.delete(topicName);
                }
            });
            subscribedTopics.clear();
            closed = true;
            clearInterval(pingInterval);
        });

        conn.on('message', (message) => {
            if (typeof message === 'string' || message instanceof Buffer) {
                try {
                    message = JSON.parse(message);
                } catch (e) {
                    return; // Ignore invalid JSON
                }
            }
            
            if (message && message.type && !closed) {
                switch (message.type) {
                    case 'subscribe':
                        (message.topics || []).forEach(topicName => {
                            if (typeof topicName === 'string') {
                                // Add conn to topic
                                let topic = topics.get(topicName);
                                if (!topic) {
                                    topic = new Set();
                                    topics.set(topicName, topic);
                                }
                                topic.add(conn);
                                // Add topic to conn
                                subscribedTopics.add(topicName);
                            }
                        });
                        break;
                    case 'unsubscribe':
                        (message.topics || []).forEach(topicName => {
                            const subs = topics.get(topicName);
                            if (subs) {
                                subs.delete(conn);
                            }
                        });
                        break;
                    case 'publish':
                        if (message.topic) {
                            const receivers = topics.get(message.topic);
                            if (receivers) {
                                message.clients = receivers.size;
                                receivers.forEach(receiver => send(receiver, message));
                            }
                        }
                        break;
                    case 'ping':
                        send(conn, { type: 'pong' });
                        break;
                }
            }
        });
    });

    console.log('✅ Yjs WebRTC Signaling server attached on /ywebrtc-signaling');
}

module.exports = { initYjsSignaling };
