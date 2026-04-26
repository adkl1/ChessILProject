import { useState, useEffect, useCallback } from 'react';
import {
    Box, Button, Flex, Text, HStack, Badge, VStack,
    DialogRoot, DialogContent, DialogHeader, DialogBody,
    DialogFooter, DialogTitle, DialogBackdrop,
} from '@chakra-ui/react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Chess, type Square } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { useAuth } from '../context/AuthContext';
import { wsService } from '../services/websocket';
import api from '../services/api';

interface RoomResponse {
    id: number;
    hostId: number;
    hostUsername: string;
    guestId: number | null;
    guestUsername: string | null;
    status: string;
}

interface GameResponse {
    id: number;
    whitePlayerId: number;
    whitePlayerUsername: string;
    blackPlayerId: number;
    blackPlayerUsername: string;
    currentTurn: string;
    status: string;
    fen?: string;
}

interface LocationState {
    room?: RoomResponse;
    myColor?: 'w' | 'b';
    gameId?: number;
}

interface MovePayload {
    from: string;
    to: string;
    promotion?: string;
}

interface PieceDropArgs {
    sourceSquare: string;
    targetSquare: string | null;
}

interface SocketEvent<T> {
    type: string;
    payload: T;
}

export default function GamePage() {
    const { id: gameId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();

    const locationState = location.state as LocationState | null;
    const room = locationState?.room ?? null;

    const [game, setGame] = useState(new Chess());
    const [gameData, setGameData] = useState<GameResponse | null>(null);
    const [gameOver, setGameOver] = useState<string | null>(null); // null = ongoing

    const myColor: 'w' | 'b' =
        gameData && user
            ? user.id === gameData.whitePlayerId
                ? 'w'
                : user.id === gameData.blackPlayerId
                    ? 'b'
                    : (locationState?.myColor ?? 'w')
            : (locationState?.myColor ?? 'w');

    const opponentName =
        gameData && user
            ? (user.id === gameData.whitePlayerId
                ? gameData.blackPlayerUsername
                : gameData.whitePlayerUsername)
            : myColor === 'w'
                ? (room?.guestUsername ?? 'Opponent')
                : (room?.hostUsername ?? 'Opponent');

    const applyGameResponse = useCallback((data: GameResponse) => {
        setGameData(data);

        if (data.fen) {
            try {
                setGame(new Chess(data.fen));
            } catch {
                console.error('Failed to parse game FEN:', data.fen);
            }
        }

        if (data.status === 'WHITE_WIN') {
            setGameOver('Game over. White wins.');
        } else if (data.status === 'BLACK_WIN') {
            setGameOver('Game over. Black wins.');
        } else if (data.status === 'DRAW') {
            setGameOver("It's a draw!");
        } else {
            setGameOver(null);
        }
    }, []);

    const syncGame = useCallback(async () => {
        if (!gameId) return;

        try {
            const { data } = await api.get<GameResponse>(`/games/${gameId}`);
            applyGameResponse(data);
        } catch (err) {
            console.error('Failed to fetch game state:', err);
        }
    }, [gameId, applyGameResponse]);

    // ── Fetch game state from backend on mount ──────────────────────────────
    useEffect(() => {
        void syncGame();
    }, [syncGame]);

    // ── Game-over detection — runs after every game state update ─────────────
    const checkGameOver = useCallback((g: Chess) => {
        if (g.isCheckmate()) {
            const winner = g.turn() === 'w' ? 'Black' : 'White';
            setGameOver(`Checkmate! ${winner} wins.`);
        } else if (g.isStalemate()) {
            setGameOver('Stalemate!');
        } else if (g.isDraw()) {
            setGameOver("It's a draw!");
        }
    }, []);

    useEffect(() => {
        checkGameOver(game);
    }, [game, checkGameOver]);

    // ── WebSocket connection — subscribe to game updates ─────────────────────
    useEffect(() => {
        if (!gameId) return;

        wsService.connect();
        wsService.subscribeToGame(gameId, (incomingPayload) => {
            const update = (incomingPayload as SocketEvent<GameResponse>).payload;
            if (!update) return;
            applyGameResponse(update);
        });

        return () => {
            wsService.unsubscribe(`game-${gameId}`);
        };
    }, [gameId, applyGameResponse]);

    // Poll the authoritative server state while a live game is active so a
    // missed terminal event does not leave one client stuck until refresh.
    useEffect(() => {
        if (!gameId || gameData?.status === 'WHITE_WIN' || gameData?.status === 'BLACK_WIN' || gameData?.status === 'DRAW') {
            return;
        }

        const intervalId = window.setInterval(() => {
            void syncGame();
        }, 3000);

        return () => {
            window.clearInterval(intervalId);
        };
    }, [gameId, gameData?.status, syncGame]);

    // ── Piece drop handler ────────────────────────────────────────────────────
    function onDrop({ sourceSquare, targetSquare }: PieceDropArgs): boolean {
        if (!targetSquare || gameOver || game.turn() !== myColor) return false;

        try {
            const movingPiece = game.get(sourceSquare as Square);
            const isPromotionMove =
                movingPiece?.type === 'p' &&
                ((movingPiece.color === 'w' && targetSquare.endsWith('8')) ||
                    (movingPiece.color === 'b' && targetSquare.endsWith('1')));

            const moveData: MovePayload = {
                from: sourceSquare,
                to: targetSquare,
                ...(isPromotionMove ? { promotion: 'q' } : {}),
            };

            // Clone the board first — never mutate React state objects directly
            const gameCopy = new Chess(game.fen());
            const move = gameCopy.move(moveData);
            if (move === null) return false;

            setGame(gameCopy);
            if (!gameId) return false;

            void api.post<GameResponse>(`/games/${gameId}/move`, moveData)
                .then(({ data }) => applyGameResponse(data))
                .catch(async (err: unknown) => {
                console.error(
                    'Move rejected by server:',
                    (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? err,
                );
                try {
                    await syncGame();
                } catch (err) {
                    console.error('Failed to sync move with server:', err);
                }
            });

            return true;
        } catch {
            return false;
        }
    }

    // ── Resign / Leave ────────────────────────────────────────────────────────
    const handleLeaveRoom = async () => {
        if (!window.confirm('Are you sure you want to resign and leave?')) return;
        if (gameId) {
            try {
                await api.post(`/games/${gameId}/resign`);
            } catch {
                // Best-effort — navigate away regardless
            }
        }
        navigate('/lobby');
    };

    const handleGameOverClose = () => {
        navigate('/lobby');
    };

    const isMyTurn = game.turn() === myColor;
    const myColorLabel = myColor === 'w' ? 'White' : 'Black';
    const opponentColorLabel = myColor === 'w' ? 'Black' : 'White';

    return (
        <Flex height="100vh" alignItems="center" justifyContent="center" bg="gray.900" p={4}>
            <Box p={6} maxWidth="600px" width="100%" bg="white" borderRadius="2xl" boxShadow="dark-lg">

                {/* Opponent info */}
                <Flex justifyContent="space-between" mb={4} alignItems="center">
                    <VStack align="start" gap={0}>
                        <Text fontSize="sm" color="gray.500">Game #{gameId}</Text>
                        <Text fontSize="xl" fontWeight="bold">{opponentName}</Text>
                        <Text fontSize="xs" color="gray.400">{opponentColorLabel}</Text>
                    </VStack>

                    <Badge
                        colorScheme={!isMyTurn ? 'purple' : 'gray'}
                        variant={!isMyTurn ? 'solid' : 'outline'}
                        p={2}
                        borderRadius="md"
                    >
                        {!isMyTurn ? `${opponentColorLabel}'s Turn` : 'Waiting…'}
                    </Badge>
                </Flex>

                {/* Chessboard */}
                <Box mb={4} borderRadius="lg" overflow="hidden" boxShadow="inner" bg="gray.100" p={2}>
                    <Chessboard
                        options={{
                            position: game.fen(),
                            onPieceDrop: onDrop,
                            boardOrientation: myColor === 'b' ? 'black' : 'white',
                            boardStyle: {
                                borderRadius: '4px',
                            },
                        }}
                    />
                </Box>

                {/* My info */}
                <Flex justifyContent="space-between" alignItems="center">
                    <VStack align="start" gap={0}>
                        <Text fontSize="sm" color="gray.500">You</Text>
                        <Text fontSize="xl" fontWeight="bold">{user?.username ?? 'You'}</Text>
                        <Text fontSize="xs" color="gray.400">{myColorLabel}</Text>
                    </VStack>

                    <HStack gap={4}>
                        <Badge
                            colorScheme={isMyTurn ? 'blue' : 'gray'}
                            variant={isMyTurn ? 'solid' : 'outline'}
                            p={2}
                            borderRadius="md"
                        >
                            {isMyTurn ? `Your Turn (${myColorLabel})` : 'Opponent Thinking…'}
                        </Badge>
                        <Button colorScheme="red" variant="ghost" size="sm" onClick={handleLeaveRoom}>
                            Resign
                        </Button>
                    </HStack>
                </Flex>
            </Box>

            {/* Game-over dialog */}
            <DialogRoot open={!!gameOver} onOpenChange={handleGameOverClose}>
                <DialogBackdrop />
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Game Over</DialogTitle>
                    </DialogHeader>
                    <DialogBody>
                        <Text fontSize="lg">{gameOver}</Text>
                    </DialogBody>
                    <DialogFooter>
                        <Button colorScheme="blue" onClick={handleGameOverClose}>
                            Back to Lobby
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </DialogRoot>
        </Flex>
    );
}
