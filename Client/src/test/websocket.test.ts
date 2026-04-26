import { vi, describe, it, expect, beforeEach } from 'vitest';

type MockClientConfig = {
    beforeConnect?: () => void;
    onConnect?: (frame: unknown) => void;
    connectHeaders?: Record<string, string>;
};

type MockClientInstance = {
    connectHeaders?: Record<string, string>;
    onStompError?: (frame: unknown) => void;
    onWebSocketClose?: () => void;
};

let capturedConfig: MockClientConfig | null = null;
let capturedClient: MockClientInstance | null = null;

const mockSubscription = { unsubscribe: vi.fn() };
const mockSubscribe = vi.fn(() => mockSubscription);
const mockActivate = vi.fn();
const mockDeactivate = vi.fn();

let _active = false;
let _connected = false;

function restoreImpls() {
    mockActivate.mockImplementation(() => {
        _active = true;
        _connected = true;
        capturedConfig?.onConnect?.({});
    });

    mockDeactivate.mockImplementation(() => {
        _active = false;
        _connected = false;
    });

    mockSubscribe.mockReturnValue(mockSubscription);
}

vi.mock('@stomp/stompjs', () => {
    class Client {
        connectHeaders?: Record<string, string>;
        onStompError?: (frame: unknown) => void;
        onWebSocketClose?: () => void;

        constructor(config: MockClientConfig) {
            capturedConfig = config;
            capturedClient = this;
        }

        get active() {
            return _active;
        }

        get connected() {
            return _connected;
        }

        activate = mockActivate;
        deactivate = mockDeactivate;
        subscribe = mockSubscribe;
    }

    return { Client };
});

const { wsService } = await import('../services/websocket');

beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    wsService.disconnect();
    _active = false;
    _connected = false;
    restoreImpls();
    vi.clearAllMocks();
});

describe('WebSocketService — token handling', () => {
    it('reads token lazily from localStorage before connecting', () => {
        localStorage.setItem('jwt_token', 'late-token');
        capturedConfig?.beforeConnect?.();
        expect(capturedClient?.connectHeaders?.Authorization).toBe('Bearer late-token');
    });

    it('sends an empty bearer token when no JWT exists', () => {
        capturedConfig?.beforeConnect?.();
        expect(capturedClient?.connectHeaders?.Authorization).toBe('Bearer ');
    });
});

describe('WebSocketService — connect()', () => {
    it('activates the STOMP client when inactive', () => {
        wsService.connect();
        expect(mockActivate).toHaveBeenCalledOnce();
    });

    it('does not activate again when already active', () => {
        _active = true;
        wsService.connect();
        expect(mockActivate).not.toHaveBeenCalled();
    });
});

describe('WebSocketService — disconnect()', () => {
    it('deactivates the STOMP client when active', () => {
        _active = true;
        wsService.disconnect();
        expect(mockDeactivate).toHaveBeenCalledOnce();
    });

    it('does not deactivate when already inactive', () => {
        wsService.disconnect();
        expect(mockDeactivate).not.toHaveBeenCalled();
    });
});

describe('WebSocketService — subscriptions', () => {
    it('subscribes to the correct room topic and parses JSON messages', () => {
        const cb = vi.fn();

        wsService.subscribeToRoom('42', cb);

        expect(mockSubscribe).toHaveBeenCalledWith('/topic/rooms/42', expect.any(Function));

        const firstSubscribeCall = mockSubscribe.mock.calls[0] as unknown as [string, (message: { body: string }) => void];
        const handler = firstSubscribeCall[1];
        handler({ body: JSON.stringify({ type: 'ROOM_JOINED', payload: { id: 42 } }) });

        expect(cb).toHaveBeenCalledWith({ type: 'ROOM_JOINED', payload: { id: 42 } });
    });

    it('unsubscribes a single registered topic', () => {
        wsService.subscribeToRoom('42', vi.fn());

        wsService.unsubscribe('room-42');

        expect(mockSubscription.unsubscribe).toHaveBeenCalledOnce();
    });

    it('re-subscribes active topics after a reconnect', () => {
        wsService.subscribeToGame('7', vi.fn());

        expect(mockSubscribe).toHaveBeenCalledTimes(1);

        capturedClient?.onWebSocketClose?.();
        capturedConfig?.onConnect?.({});

        expect(mockSubscribe).toHaveBeenCalledTimes(2);
        expect(mockSubscribe).toHaveBeenNthCalledWith(2, '/topic/games/7', expect.any(Function));
    });
});
