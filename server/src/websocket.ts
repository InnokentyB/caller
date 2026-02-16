import { Server } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/db';

interface ExtWebSocket extends WebSocket {
    userId?: string;
    isAlive: boolean;
}

export const setupWebSocket = (server: Server) => {
    const wss = new WebSocketServer({ server });

    // Heartbeat
    const interval = setInterval(() => {
        wss.clients.forEach((ws) => {
            const extWs = ws as ExtWebSocket;
            if (extWs.isAlive === false) return ws.terminate();
            extWs.isAlive = false;
            ws.ping();
        });
    }, 30000);

    wss.on('close', () => clearInterval(interval));

    wss.on('connection', (ws: ExtWebSocket) => {
        ws.isAlive = true;
        ws.on('pong', () => { ws.isAlive = true; });

        ws.on('message', (data: string) => {
            try {
                const message = JSON.parse(data);
                handleMessage(ws, message, wss);
            } catch (e) {
                console.error('Invalid JSON', e);
            }
        });

        ws.on('close', () => {
            if (ws.userId) {
                console.log(`User ${ws.userId} disconnected`);
                // Optional: Broadcast presence offline
            }
        });
    });
};

function handleMessage(ws: ExtWebSocket, message: any, wss: WebSocketServer) {
    const { type, payload } = message;

    switch (type) {
        case 'AUTH':
            const { token } = payload;
            const stmt = db.prepare('SELECT user_id FROM sessions WHERE token = ?');
            const session = stmt.get(token) as { user_id: string };

            if (session) {
                ws.userId = session.user_id;
                ws.send(JSON.stringify({ type: 'AUTH_SUCCESS', userId: session.user_id }));
                console.log(`User ${session.user_id} authenticated via WS`);
            } else {
                ws.send(JSON.stringify({ type: 'AUTH_ERROR', error: 'Invalid token' }));
                ws.close();
            }
            break;

        case 'MSG_SEND':
            if (!ws.userId) return;
            const { to, body, clientIds } = payload;
            const msgId = uuidv4();

            try {
                // Store in DB
                const insertMsg = db.prepare('INSERT INTO messages (id, sender_id, recipient_id, content) VALUES (?, ?, ?, ?)');
                insertMsg.run(msgId, ws.userId, to, body);

                // Ack to sender
                ws.send(JSON.stringify({ type: 'MSG_SENT', payload: { msgId, oldId: clientIds } }));

                // Send to recipient if online
                wss.clients.forEach((client) => {
                    const extClient = client as ExtWebSocket;
                    if (extClient.userId === to && extClient.readyState === WebSocket.OPEN) {
                        extClient.send(JSON.stringify({
                            type: 'MSG_RECEIVE',
                            payload: {
                                id: msgId,
                                from: ws.userId,
                                content: body,
                                timestamp: new Date().toISOString()
                            }
                        }));
                    }
                });

            } catch (e) {
                console.error("Message send error", e);
            }
            break;

        default:
            console.log("Unknown message type", type);
    }
}
