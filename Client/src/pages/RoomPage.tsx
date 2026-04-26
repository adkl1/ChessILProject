import { useState, useEffect } from 'react';
import { Box, Button, Flex, Text, VStack, Spinner, Center } from '@chakra-ui/react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
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
    gameId?: number;
}

interface GameStartResponse {
    id: number;
    whitePlayerId: number;
    whitePlayerUsername: string;
    blackPlayerId: number;
    blackPlayerUsername: string;
    currentTurn: string;
    fen?: string;
    status: string;
}

interface SocketEvent<T> {
    type: string;
    payload: T;
}

export default function RoomPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    
    const [room, setRoom] = useState<RoomResponse | null>(location.state?.room ?? null);
    const [loading, setLoading] = useState(!room);
    const [startingGame, setStartingGame] = useState(false);
    const [error, setError] = useState('');
    
    const myColor = location.state?.myColor ?? 'w';

    useEffect(() => {
        let active = true;

        const fetchRooms = async () => {
            try {
                const { data } = await api.get<RoomResponse[]>('/rooms');
                const found = data.find(r => r.id === Number(id));
                if (!active) return;

                if (found) {
                    setRoom(found);
                    return;
                }

                setRoom(null);
                navigate('/lobby', { replace: true });
            } catch (err) {
                console.error(err);
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        };

        fetchRooms();

        return () => {
            active = false;
        };
    }, [id, navigate]);

    useEffect(() => {
        if (!id) return;

        let active = true;
        const exitRoom = () => {
            if (!active) return;
            setRoom(null);
            setLoading(false);
            navigate('/lobby', { replace: true });
        };

        wsService.connect();
        wsService.subscribeToRoom(id, (payload) => {
            const event = payload as SocketEvent<RoomResponse | null>;
            if (event.type === 'ROOM_DELETED' || event.type === 'ROOM_CLOSED') {
                exitRoom();
                return;
            }

            if (!event.payload) return;
            setRoom(event.payload);
        });

        return () => {
            active = false;
            wsService.unsubscribe(`room-${id}`);
        };
    }, [id, navigate]);

    useEffect(() => {
        if (room?.status === 'IN_GAME' && room?.gameId) {
            navigate(`/game/${room.gameId}`, {
                state: { room, myColor },
            });
        }
    }, [room?.status, room?.gameId, navigate, myColor, room]);

    const isHost = user?.id === room?.hostId;
    const isFull = !!room?.guestUsername;

    const handleLeave = async () => {
        try {
            await api.delete(`/rooms/${id}`);
        } catch (err) {
            console.error(err);
        }
        navigate('/lobby');
    };

    const handleStartGame = async () => {
        if (!isHost || !isFull) return;
        setStartingGame(true);
        setError('');
        try {
            const { data } = await api.post<GameStartResponse>(`/games/rooms/${id}/start`);
            navigate(`/game/${data.id}`, {
                state: { room, myColor, gameId: data.id },
            });
        } catch (err: unknown) {
            const msg =
                (err as { response?: { data?: { message?: string } } })
                    ?.response?.data?.message ?? 'Could not start game.';
            setError(msg);
        } finally {
            setStartingGame(false);
        }
    };

    return (
        <Flex height="100vh" alignItems="center" justifyContent="center" bg="gray.50">
            <Box p={8} maxWidth="500px" width="100%" bg="white" borderWidth={1} borderRadius={8} boxShadow="lg">
                <Text fontSize="2xl" fontWeight="bold" mb={4}>Waiting Room #{id}</Text>
                
                {error && (
                    <Text color="red.500" fontSize="sm" mb={4} textAlign="center">
                        {error}
                    </Text>
                )}

                {loading ? <Center><Spinner /></Center> : (
                    <VStack gap={4} align="stretch">
                        <Box p={4} borderWidth={1} borderRadius="md" bg="gray.50">
                            <Text><strong>Host (White):</strong> {room?.hostUsername}</Text>
                            <Text><strong>Guest (Black):</strong> {room?.guestUsername || 'Waiting for opponent...'} </Text>
                        </Box>
                        
                        <Flex gap={4}>
                            <Button flex={1} colorScheme="red" variant="outline" onClick={handleLeave}>
                                Leave Room
                            </Button>
                            
                            {isHost ? (
                                <Button
                                    flex={1}
                                    colorScheme="blue"
                                    disabled={!isFull || startingGame}
                                    loading={startingGame}
                                    loadingText="Starting…"
                                    onClick={handleStartGame}
                                >
                                    {isFull ? 'Start Game' : 'Waiting...'}
                                </Button>
                            ) : (
                                <Button flex={1} colorScheme="blue" disabled>
                                    Waiting for Host to Start
                                </Button>
                            )}
                        </Flex>
                    </VStack>
                )}
            </Box>
        </Flex>
    );
}
