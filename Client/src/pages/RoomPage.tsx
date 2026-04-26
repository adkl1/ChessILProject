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
    status: string;
    gameId?: number; // The backend may include gameId when the game starts
}

interface GameStartResponse {
    id: number;       // gameId
    roomId: number;
    whitePlayerId: number;
    blackPlayerId: number;
    status: string;
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

    // ── Initial room data fetch ──────────────────────────────────────────────
    useEffect(() => {
        const fetchRooms = async () => {
            try {
                const { data } = await api.get<RoomResponse[]>('/rooms');
                const found = data.find(r => r.id === Number(id));
                if (found) {
                    setRoom(found);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchRooms();
    }, [id]);

    // ── WebSocket subscription for real-time room updates ────────────────────
    useEffect(() => {
        if (!id) return;

        wsService.connect(() => {
            wsService.subscribeToRoom(id, (payload) => {
                const update = payload as RoomResponse;
                console.log('[WS] Room update:', update);
                setRoom(update);
            });
        });

        return () => {
            wsService.unsubscribe(`room-${id}`);
        };
    }, [id]);

    // ── Auto-navigate when the game starts (for the guest) ───────────────────
    useEffect(() => {
        if (room?.status === 'IN_GAME' && room?.gameId) {
            navigate(`/game/${room.gameId}`, {
                state: { room, myColor },
            });
        }
    }, [room?.status, room?.gameId, navigate, myColor, room]);

    const isHost = user?.id === room?.hostId;
    const isFull = !!room?.guestUsername;

    // ── Leave / Delete room ──────────────────────────────────────────────────
    const handleLeave = async () => {
        try {
            await api.delete(`/rooms/${id}`);
        } catch {}
        navigate('/lobby');
    };

    // ── Start game (host only) ───────────────────────────────────────────────
    const handleStartGame = async () => {
        if (!isHost || !isFull) return;
        setStartingGame(true);
        setError('');
        try {
            const { data } = await api.post<GameStartResponse>(`/games/rooms/${id}/start`);
            // Navigate to the game page using the gameId returned by the backend
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
