import { useState, useEffect, useCallback } from 'react';
import {
    Box, Button, Flex, Text, HStack, Badge, VStack,
    DialogRoot, DialogContent, DialogHeader, DialogBody,
    DialogFooter, DialogTitle, DialogBackdrop,
} from '@chakra-ui/react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Chess } from 'chess.js';
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
    roomId: number;
    whitePlayerId: number;
    blackPlayerId: number;
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

export default function GamePage() {
    const { id: gameId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();

    const locationState = location.state as LocationState | null;
    const room = locationState?.room ?? null;

    // Host = White, Guest = Black. Falls back to state passed from lobby.
    const myColor: 'w' | 'b' = locationState?.myColor ?? 'w';

    const opponentName =
        myColor === 'w'
            ? (room?.guestUsername ?? 'Opponent')
            : (room?.hostUsername ?? 'Opponent');

    const [game, setGame] = useState(new Chess());
    const [gameOver, setGameOver] = useState<string | null>(null); // null = ongoing

    // ── Fetch game state from backend on mount ──────────────────────────────
    useEffect(() => {
        if (!gameId) return;

        const fetchGame = async () => {
            try {
                const { data } = await api.get<GameResponse>(`/games/${gameId}`);
                // If the server provides a FEN, load it
                if (data.fen) {
                    setGame(new Chess(data.fen));
                }
            } catch (err) {
                console.error('Failed to fetch game state:', err);
            }
        };

        fetchGame();
    }, [gameId]);

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

        wsService.connect(() => {
            wsService.subscribeToGame(gameId, (incomingPayload) => {
                const incomingMove = incomingPayload as MovePayload;
                setGame((currentGame) => {
                    // Ignore moves if the game is already over
                    if (currentGame.isGameOver()) return currentGame;
                    try {
                        const gameCopy = new Chess(currentGame.fen());
                        const move = gameCopy.move(incomingMove);
                        // Return the new state only if the move was legal
                        return move ? gameCopy : currentGame;
                    } catch {
                        return currentGame;
                    }
                });
            });
        });

        return () => {
            wsService.unsubscribe(`game-${gameId}`);
        };
    }, [gameId]);

    // ── Piece drop handler ────────────────────────────────────────────────────
    function onDrop(sourceSquare: string, targetSquare: string): boolean {
        if (!targetSquare || gameOver || game.turn() !== myColor) return false;

        try {
            const moveData: MovePayload = {
                from: sourceSquare,
                to: targetSquare,
                promotion: 'q', // auto-promote to queen
            };

            // Clone the board first — never mutate React state objects directly
            const gameCopy = new Chess(game.fen());
            const move = gameCopy.move(moveData);
            if (move === null) return false;

            setGame(gameCopy);
            // checkGameOver will run automatically via the useEffect that watches `game`

            // Send move to server via WebSocket
            if (gameId) wsService.sendMove(gameId, moveData);

            return true;
        } catch {
            return false;
        }
    }

    // ── Resign / Leave ────────────────────────────────────────────────────────
    const handleLeaveRoom = async () => {
        if (!window.confirm('Are you sure you want to resign and leave?')) return;
        if (room?.id) {
            try {
                await api.delete(`/rooms/${room.id}`);
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
                        position={game.fen()}
                        onPieceDrop={onDrop}
                        boardOrientation={myColor === 'b' ? 'black' : 'white'}
                        customBoardStyle={{
                            borderRadius: '4px',
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