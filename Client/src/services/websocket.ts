import { Client, type IMessage, type StompSubscription } from '@stomp/stompjs';

type SubscriptionEntry = {
    destination: string;
    callback: (message: unknown) => void;
    subscription?: StompSubscription;
};

class WebSocketService {
    private client: Client;
    private subscriptions: Map<string, SubscriptionEntry> = new Map();

    constructor() {
        const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8080/ws';

        this.client = new Client({
            brokerURL: wsUrl,

            beforeConnect: () => {
                this.client.connectHeaders = {
                    Authorization: `Bearer ${localStorage.getItem('jwt_token') ?? ''}`,
                };
            },

            debug: (str) => {
                console.log('[STOMP]:', str);
            },

            onConnect: () => {
                this.resubscribeAll();
            },

            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
        });

        this.client.onWebSocketClose = () => {
            this.subscriptions.forEach((entry) => {
                entry.subscription = undefined;
            });
        };

        this.client.onStompError = (frame) => {
            console.error('STOMP error:', frame.headers['message']);
        };
    }

    public connect() {
        if (!this.client.active) {
            this.client.activate();
        }
    }

    public disconnect() {
        this.subscriptions.forEach((entry) => entry.subscription?.unsubscribe());
        this.subscriptions.clear();
        if (this.client.active) {
            this.client.deactivate();
        }
    }

    public unsubscribe(key: string) {
        const entry = this.subscriptions.get(key);
        if (entry?.subscription) {
            entry.subscription.unsubscribe();
        }
        this.subscriptions.delete(key);
    }

    private resubscribeAll() {
        this.subscriptions.forEach((entry, key) => {
            this.attachSubscription(key, entry);
        });
    }

    private attachSubscription(key: string, entry: SubscriptionEntry) {
        if (!this.client.connected) {
            return;
        }

        entry.subscription?.unsubscribe();
        entry.subscription = this.client.subscribe(
            entry.destination,
            (message: IMessage) => {
                try {
                    entry.callback(JSON.parse(message.body));
                } catch (error) {
                    console.error(`[WS] Failed to parse message for ${entry.destination}:`, error);
                }
            },
        );
        this.subscriptions.set(key, entry);
    }

    private registerSubscription(
        key: string,
        destination: string,
        callback: (message: unknown) => void,
    ) {
        this.unsubscribe(key);

        const entry: SubscriptionEntry = {
            destination,
            callback,
        };

        this.subscriptions.set(key, entry);

        if (this.client.connected) {
            this.attachSubscription(key, entry);
            return;
        }

        this.connect();
    }

    public subscribeToRooms(
        callback: (message: unknown) => void,
    ) {
        this.registerSubscription('rooms', '/topic/rooms', callback);
    }

    public subscribeToRoom(
        roomId: string | number,
        callback: (message: unknown) => void,
    ) {
        const key = `room-${roomId}`;
        this.registerSubscription(key, `/topic/rooms/${roomId}`, callback);
    }

    public subscribeToGame(
        gameId: string | number,
        callback: (message: unknown) => void,
    ) {
        const key = `game-${gameId}`;
        this.registerSubscription(key, `/topic/games/${gameId}`, callback);
    }
}

export const wsService = new WebSocketService();
