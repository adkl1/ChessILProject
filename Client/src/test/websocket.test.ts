/**
 * websocket.test.ts
 *
 * Tests the WebSocketService:
 *  - reads JWT lazily from localStorage (NOT at import time)
 *  - connect() calls activate() and fires the onConnected callback
 *  - connect() is a no-op + fires callback when already active
 *  - disconnect() calls deactivate() only when active
 *  - subscribeToRoom() subscribes to the correct STOMP topic
 *  - subscribeToRoom() parses JSON and calls the provided callback
 *  - sendMove() publishes to the correct destination when connected
 *  - sendMove() is a no-op when not connected
 */
import { vi, describe, it, expect, beforeEach } from 'vitest';

// ── Capture the config the service passes to new Client() ─────────────────
type MockClientConfig = {
    beforeConnect?: () => void;
    connectHeaders?: Record<string, string>;
};

let capturedConfig: MockClientConfig | null = null;
let capturedClient: { connectHeaders?: Record<string, string> } | null = null;

const mockSubscription = { unsubscribe: vi.fn() };
const mockPublish     = vi.fn();
const mockSubscribe   = vi.fn(() => mockSubscription);
const mockActivate    = vi.fn();
const mockDeactivate  = vi.fn();

// Mutable state shared by every mockClient instance
let _active    = false;
let _connected = false;
let _onConnect: ((f: unknown) => void) | null = null;

// Restore these implementations before each test (vi.clearAllMocks resets them)
function restoreImpls() {
    mockActivate.mockImplementation(() => {
        _active    = true;
        _connected = true;
        _onConnect?.({});          // fire immediately so callbacks run synchronously
    });
    mockDeactivate.mockImplementation(() => {
        _active    = false;
        _connected = false;
    });
    mockSubscribe.mockReturnValue(mockSubscription);
}

// ── Mock @stomp/stompjs with a real class so `new Client(config)` works ───
vi.mock('@stomp/stompjs', () => {
    class Client {
        constructor(config: MockClientConfig) {
            capturedConfig = config;
            capturedClient = this;
        }
        get active()    { return _active; }
        get connected() { return _connected; }
        set onConnect(fn: ((f: unknown) => void) | null) { _onConnect = fn; }
        activate    = mockActivate;
        deactivate  = mockDeactivate;
        subscribe   = mockSubscribe;
        publish     = mockPublish;
    }
    return { Client };
});

// Import AFTER vi.mock() is hoisted
const { wsService } = await import('../services/websocket');

// ── Reset before each test ────────────────────────────────────────────────
beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    _active    = false;
    _connected = false;
    _onConnect = null;
    restoreImpls();
});

// ── Tests ─────────────────────────────────────────────────────────────────
describe('WebSocketService — token handling', () => {
    it('reads token lazily: token set AFTER import is still picked up', () => {
        localStorage.setItem('jwt_token', 'late-token');
        capturedConfig!.beforeConnect?.();
        expect(capturedClient!.connectHeaders?.Authorization).toBe('Bearer late-token');
    });

    it('sends "Bearer " when no token exists in localStorage', () => {
        capturedConfig!.beforeConnect?.();
        expect(capturedClient!.connectHeaders?.Authorization).toBe('Bearer ');
    });
});

describe('WebSocketService — connect()', () => {
    it('calls activate() when not yet connected', () => {
        wsService.connect();
        expect(mockActivate).toHaveBeenCalledOnce();
    });

    it('fires the onConnected callback after activation', () => {
        const cb = vi.fn();
        wsService.connect(cb);
        expect(cb).toHaveBeenCalledOnce();
    });

    it('does NOT call activate() again if already active, but still fires callback', () => {
        _active = true;
        const cb = vi.fn();
        wsService.connect(cb);
        expect(mockActivate).not.toHaveBeenCalled();
        expect(cb).toHaveBeenCalledOnce();
    });
});

describe('WebSocketService — disconnect()', () => {
    it('calls deactivate() when active', () => {
        _active = true;
        wsService.disconnect();
        expect(mockDeactivate).toHaveBeenCalledOnce();
    });

    it('does NOT call deactivate() when already inactive', () => {
        _active = false;
        wsService.disconnect();
        expect(mockDeactivate).not.toHaveBeenCalled();
    });
});

describe('WebSocketService — subscribeToRoom()', () => {
    it('subscribes to the correct STOMP topic', () => {
        wsService.connect();
        wsService.subscribeToRoom('42', vi.fn());
        expect(mockSubscribe).toHaveBeenCalledWith('/topic/rooms/42', expect.any(Function));
    });

    it('parses incoming JSON and passes the object to the callback', () => {
        const cb = vi.fn();
        wsService.connect();
        wsService.subscribeToRoom('1', cb);

        const handler = mockSubscribe.mock.calls[0][1] as (m: { body: string }) => void;
        handler({ body: JSON.stringify({ from: 'e2', to: 'e4', promotion: 'q' }) });

        expect(cb).toHaveBeenCalledWith({ from: 'e2', to: 'e4', promotion: 'q' });
    });
});

describe('WebSocketService — sendMove()', () => {
    it('publishes to the correct STOMP destination when connected', () => {
        _connected = true;
        const move = { from: 'e2', to: 'e4', promotion: 'q' };
        wsService.sendMove('99', move);
        expect(mockPublish).toHaveBeenCalledWith({
            destination: '/app/game/99/move',
            body: JSON.stringify(move),
        });
    });

    it('does NOT publish when not connected', () => {
        _connected = false;
        wsService.sendMove('99', { from: 'e2', to: 'e4' });
        expect(mockPublish).not.toHaveBeenCalled();
    });
});
