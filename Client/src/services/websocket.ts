import { Client, type StompSubscription } from '@stomp/stompjs';

/**
 * WebSocket service using STOMP over SockJS.
 *
 * Backend WS endpoint: /ws
 * Subscription topics:
 *   /topic/rooms            — global room list updates
 *   /topic/rooms/{roomId}   — specific room updates (join, leave, game start)
 *   /topic/games/{gameId}   — game updates (moves, game over)
 */
class WebSocketService {
    private client: Client;
    private subscriptions: Map<string, StompSubscription> = new Map();

    constructor() {
        const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8080/ws';

        this.client = new Client({
            brokerURL: wsUrl,

            // Refresh auth headers right before each connect/reconnect.
            beforeConnect: () => {
                this.client.connectHeaders = {
                    Authorization: `Bearer ${localStorage.getItem('jwt_token') ?? ''}`,
                };
            },

            debug: (str) => {
                console.log('[STOMP]:', str);
            },

            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
        });

        this.client.onStompError = (frame) => {
            console.error('STOMP error:', frame.headers['message']);
        };
    }

    /**
     * Activates the STOMP connection.
     * Calls `onConnected` once the broker confirms the session,
     * which is the safe moment to subscribe to topics.
     */
    public connect(onConnected?: () => void) {
        if (this.client.connected) {
            // Already connected — fire the callback immediately
            onConnected?.();
            return;
        }
        if (onConnected) {
            this.client.onConnect = () => onConnected();
        }
        if (!this.client.active) {
            this.client.activate();
        }
    }

    /** Cleanly unsubscribes from all topics and closes the STOMP session. */
    public disconnect() {
        this.subscriptions.forEach((sub) => sub.unsubscribe());
        this.subscriptions.clear();
        if (this.client.active) {
            this.client.deactivate();
        }
    }

    /** Unsubscribes from a specific topic key. */
    public unsubscribe(key: string) {
        const sub = this.subscriptions.get(key);
        if (sub) {
            sub.unsubscribe();
            this.subscriptions.delete(key);
        }
    }

    /**
     * Subscribes to the global rooms topic: /topic/rooms
     * Receives all room updates (create, join, leave, delete).
     */
    public subscribeToRooms(
        callback: (message: unknown) => void,
    ) {
        this.unsubscribe('rooms');
        const sub = this.client.subscribe(
            '/topic/rooms',
            (message) => callback(JSON.parse(message.body)),
        );
        this.subscriptions.set('rooms', sub);
    }

    /**
     * Subscribes to a specific room's topic: /topic/rooms/{roomId}
     * Receives updates for that room (e.g., guest joined, game starting).
     */
    public subscribeToRoom(
        roomId: string | number,
        callback: (message: unknown) => void,
    ) {
        const key = `room-${roomId}`;
        this.unsubscribe(key);
        const sub = this.client.subscribe(
            `/topic/rooms/${roomId}`,
            (message) => callback(JSON.parse(message.body)),
        );
        this.subscriptions.set(key, sub);
    }

    /**
     * Subscribes to a specific game's topic: /topic/games/{gameId}
     * Receives game updates (moves, game over, etc.).
     */
    public subscribeToGame(
        gameId: string | number,
        callback: (message: unknown) => void,
    ) {
        const key = `game-${gameId}`;
        this.unsubscribe(key);
        const sub = this.client.subscribe(
            `/topic/games/${gameId}`,
            (message) => callback(JSON.parse(message.body)),
        );
        this.subscriptions.set(key, sub);
    }

    /** Sends a chess move to the server for the given game. */
    public sendMove(
        gameId: string | number,
        move: { from: string; to: string; promotion?: string },
    ) {
        if (this.client.connected) {
            this.client.publish({
                destination: `/app/game/${gameId}/move`,
                body: JSON.stringify(move),
            });
        } else {
            console.warn('[WS] sendMove called while not connected');
        }
    }
}

// Singleton — one shared STOMP client for the whole app lifetime
export const wsService = new WebSocketService();