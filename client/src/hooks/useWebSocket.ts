
import { useEffect, useRef, useState, useCallback } from 'react';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3000';

export interface MessagePayload {
    id: string;
    from: string;
    content: string;
    timestamp: string;
}

export function useWebSocket(token: string, onMessageReceived: (data: any) => void) {
    const ws = useRef<WebSocket | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        if (!token) return;

        const socket = new WebSocket(WS_URL);
        ws.current = socket;

        socket.onopen = () => {
            console.log('WS Connected');
            setIsConnected(true);
            // Auth
            socket.send(JSON.stringify({
                type: 'AUTH',
                payload: { token }
            }));
        };

        socket.onclose = () => {
            console.log('WS Disconnected');
            setIsConnected(false);
        };


        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                onMessageReceived(data);
            } catch (e) {
                console.error('WS Error', e);
            }
        };

        return () => {
            socket.close();
        };
    }, [token, onMessageReceived]);

    const sendSignal = useCallback((type: string, payload: any) => {
        if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({ type, payload }));
        }
    }, []);

    const sendMessage = useCallback((to: string, body: string, tempId: string) => {
        sendSignal('MSG_SEND', { to, body, clientIds: tempId });
    }, [sendSignal]);

    return { isConnected, sendMessage, sendSignal };
}
