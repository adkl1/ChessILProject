import { render, waitFor } from '@testing-library/react';
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import MockAdapter from 'axios-mock-adapter';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import { AuthProvider } from '../context/AuthContext';
import RoomPage from '../pages/RoomPage';
import api from '../services/api';

interface RoomResponse {
    id: number;
    hostId: number;
    hostUsername: string;
    guestId: number | null;
    guestUsername: string | null;
    status: 'WAITING' | 'FULL' | 'IN_GAME' | 'CLOSED';
    gameId?: number;
}

const mockNavigate = vi.fn();
let roomSubscription: ((message: unknown) => void) | undefined;

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
    return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../services/websocket', () => ({
    wsService: {
        connect: vi.fn(),
        subscribeToRoom: vi.fn((_roomId: string | number, callback: (message: unknown) => void) => {
            roomSubscription = callback;
        }),
        unsubscribe: vi.fn(),
    },
}));

let mock: MockAdapter;

function renderRoomPage(room: RoomResponse) {
    return render(
        <ChakraProvider value={defaultSystem}>
            <AuthProvider>
                <MemoryRouter
                    initialEntries={[
                        {
                            pathname: `/room/${room.id}`,
                            state: { room, myColor: 'b' },
                        },
                    ]}
                >
                    <Routes>
                        <Route path="/room/:id" element={<RoomPage />} />
                    </Routes>
                </MemoryRouter>
            </AuthProvider>
        </ChakraProvider>,
    );
}

beforeEach(() => {
    mock = new MockAdapter(api);
    localStorage.clear();
    localStorage.setItem('jwt_token', 'token');
    localStorage.setItem(
        'chess_user',
        JSON.stringify({ id: 2, username: 'guest', email: 'guest@example.com' }),
    );
    mockNavigate.mockReset();
    roomSubscription = undefined;
});

afterEach(() => {
    mock.restore();
});

describe('RoomPage', () => {
    it('redirects the guest to the lobby when the host deletes the room', async () => {
        const room: RoomResponse = {
            id: 7,
            hostId: 1,
            hostUsername: 'host',
            guestId: 2,
            guestUsername: 'guest',
            status: 'FULL',
        };

        mock.onGet('/rooms').reply(200, [room]);

        renderRoomPage(room);

        await waitFor(() => {
            expect(roomSubscription).toBeDefined();
        });

        roomSubscription?.({
            type: 'ROOM_DELETED',
            payload: room,
        });

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/lobby', { replace: true });
        });
    });
});
