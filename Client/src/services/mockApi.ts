import MockAdapter from 'axios-mock-adapter';
import api from './api';

// Create a mock instance on the default api
const mock = new MockAdapter(api, { delayResponse: 500 });

// Fake database
let rooms = [
    { id: 101, hostId: 1, hostUsername: 'Adiel', guestId: null, guestUsername: null, status: 'WAITING' },
    { id: 102, hostId: 2, hostUsername: 'Kasparov', guestId: null, guestUsername: null, status: 'WAITING' },
];

// 1. Mock Login & Register
const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0QHRlc3QuY29tIiwiZXhwIjoxOTk5OTk5OTk5fQ.fake_signature';

mock.onPost('/auth/login').reply(200, { token: mockToken });
mock.onPost('/auth/register').reply(200, { token: mockToken });

// 2. Mock Rooms fetching
mock.onGet('/rooms').reply(() => [200, rooms]);

// 3. Mock Create Room
let nextRoomId = 103;
mock.onPost('/rooms').reply((config) => {
    // We assume the user is whoever they logged in as. We'll just hardcode 'Rotem' for the mock.
    const newRoom = { id: nextRoomId++, hostId: 99, hostUsername: 'Rotem', guestId: null, guestUsername: null, status: 'WAITING' };
    rooms.push(newRoom);
    return [200, newRoom];
});

// 4. Mock Join Room
mock.onPost(new RegExp('/rooms/\\d+/join')).reply((config) => {
    const urlMatches = config.url?.match(/\/rooms\/(\d+)\/join/);
    if (urlMatches) {
        const roomId = Number(urlMatches[1]);
        const roomIndex = rooms.findIndex(r => r.id === roomId);
        if (roomIndex > -1) {
            rooms[roomIndex] = { ...rooms[roomIndex], guestId: 99, guestUsername: 'Rotem', status: 'IN_GAME' };
            return [200, rooms[roomIndex]];
        }
    }
    return [404, { message: 'Room not found' }];
});

// 5. Mock Leave Room
mock.onDelete(new RegExp('/rooms/\\d+')).reply((config) => {
    const urlMatches = config.url?.match(/\/rooms\/(\d+)/);
    if (urlMatches) {
        const roomId = Number(urlMatches[1]);
        rooms = rooms.filter(r => r.id !== roomId);
        return [200, { message: 'Room deleted' }];
    }
    return [404, { message: 'Room not found' }];
});

export default mock;
