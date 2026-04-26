import { useState, useEffect, useCallback } from 'react';
import {
    Box, Button, Flex, Text, VStack, Spinner, Center, Badge,
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { wsService } from '../services/websocket';

interface RoomResponse {
    id: number;
    hostId: number;
    hostUsername: string;
    guestId: number | null;
    guestUsername: string | null;
    status: 'WAITING' | 'FULL' | 'IN_GAME' | 'CLOSED';
}

export default function LobbyPage() {
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    const [rooms, setRooms] = useState<RoomResponse[]>([]);
    const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState('');

    // ── Fetch rooms from REST endpoint ───────────────────────────────────────
    const fetchRooms = useCallback(async () => {
        try {
            const { data } = await api.get<RoomResponse[]>('/rooms');
            // Show active rooms (WAITING and FULL)
            setRooms(data.filter((r) => r.status === 'WAITING' || r.status === 'FULL'));
        } catch {
            setError('Could not load rooms. Is the server running?');
        } finally {
            setLoading(false);
        }
    }, []);

    // ── Initial load + WebSocket subscription for live updates ───────────────
    useEffect(() => {
        fetchRooms();

        // Connect to WebSocket and subscribe to global room updates
        wsService.connect();
        wsService.subscribeToRooms((payload) => {
            // The server broadcasts room updates — refresh the list
            // Payload could be a single room update or a signal to refetch
            console.log('[WS] Room update received:', payload);
            fetchRooms();
        });

        return () => {
            wsService.unsubscribe('rooms');
        };
    }, [fetchRooms]);

    // ── Create a new room ────────────────────────────────────────────────────
    const handleCreateRoom = async () => {
        setActionLoading(true);
        setError('');
        try {
            const { data } = await api.post<RoomResponse>('/rooms');
            // Host is White — navigate to the waiting room
            navigate(`/room/${data.id}`, {
                state: { room: data, myColor: 'w' },
            });
        } catch (err: unknown) {
            const msg =
                (err as { response?: { data?: { message?: string } } })
                    ?.response?.data?.message ?? 'Could not create room.';
            setError(msg);
        } finally {
            setActionLoading(false);
        }
    };

    // ── Join a selected room ─────────────────────────────────────────────────
    const handleJoinRoom = async () => {
        if (!selectedRoomId) return;
        setActionLoading(true);
        setError('');
        try {
            const { data } = await api.post<RoomResponse>(`/rooms/${selectedRoomId}/join`);
            // Guest is Black
            navigate(`/room/${data.id}`, {
                state: { room: data, myColor: 'b' },
            });
        } catch (err: unknown) {
            const msg =
                (err as { response?: { data?: { message?: string } } })
                    ?.response?.data?.message ?? 'Could not join room.';
            setError(msg);
            fetchRooms(); // Refresh — room may now be full
        } finally {
            setActionLoading(false);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // Check if a room can be joined (only WAITING rooms)
    const canJoinRoom = (room: RoomResponse) => room.status === 'WAITING';

    // Don't allow joining your own room
    const isOwnRoom = (room: RoomResponse) => user?.id === room.hostId;

    return (
        <Flex height="100vh" alignItems="center" justifyContent="center" bg="gray.50">
            <Box p={8} maxWidth="500px" width="100%" bg="white" borderWidth={1} borderRadius={8} boxShadow="lg">

                {/* Header */}
                <Flex justifyContent="space-between" alignItems="center" mb={6}>
                    <Text fontSize="3xl" fontWeight="bold">Rooms</Text>
                    <Flex gap={2}>
                        <Button size="sm" variant="outline" onClick={() => navigate('/menu')}>
                            Menu
                        </Button>
                        <Button size="sm" variant="ghost" colorScheme="red" onClick={handleLogout}>
                            Logout
                        </Button>
                    </Flex>
                </Flex>

                {/* Error banner */}
                {error && (
                    <Text color="red.500" fontSize="sm" mb={4} textAlign="center">
                        {error}
                    </Text>
                )}

                {/* Room list */}
                {loading ? (
                    <Center py={8}><Spinner /></Center>
                ) : rooms.length === 0 ? (
                    <Text textAlign="center" color="gray.400" py={8}>
                        No open rooms. Create one!
                    </Text>
                ) : (
                    <VStack gap={3} mb={8}>
                        {rooms.map((room) => (
                            <Box
                                key={room.id}
                                p={4}
                                borderWidth={2}
                                borderRadius="md"
                                width="100%"
                                textAlign="center"
                                cursor={canJoinRoom(room) && !isOwnRoom(room) ? 'pointer' : 'default'}
                                borderColor={selectedRoomId === room.id ? 'blue.500' : 'gray.200'}
                                bg={selectedRoomId === room.id ? 'blue.50' : 'white'}
                                onClick={() => {
                                    if (canJoinRoom(room) && !isOwnRoom(room)) {
                                        setSelectedRoomId(room.id);
                                    }
                                }}
                                _hover={canJoinRoom(room) && !isOwnRoom(room) ? { borderColor: 'blue.300' } : {}}
                                opacity={isOwnRoom(room) ? 0.6 : 1}
                            >
                                <Flex justifyContent="space-between" alignItems="center">
                                    <Text fontSize="lg" fontWeight="semibold">
                                        {room.hostUsername}'s room
                                    </Text>
                                    <Badge
                                        colorScheme={room.status === 'WAITING' ? 'green' : 'yellow'}
                                        variant="solid"
                                    >
                                        {room.status === 'WAITING' ? 'Open' : 'Full'}
                                    </Badge>
                                </Flex>
                                <Text fontSize="sm" color="gray.400">
                                    {room.status === 'WAITING'
                                        ? 'Waiting for opponent…'
                                        : `${room.guestUsername} joined`}
                                </Text>
                            </Box>
                        ))}
                    </VStack>
                )}

                {/* Actions */}
                <Flex justifyContent="space-between" gap={4} mt={rooms.length === 0 ? 0 : undefined}>
                    <Button
                        bg="blue.500"
                        color="white"
                        flex={1}
                        onClick={handleJoinRoom}
                        disabled={!selectedRoomId || actionLoading}
                        loading={actionLoading}
                    >
                        Join Room
                    </Button>
                    <Button
                        variant="outline"
                        borderColor="gray.400"
                        flex={1}
                        onClick={handleCreateRoom}
                        disabled={actionLoading}
                        loading={actionLoading}
                    >
                        Create Room
                    </Button>
                </Flex>
            </Box>
        </Flex>
    );
}
