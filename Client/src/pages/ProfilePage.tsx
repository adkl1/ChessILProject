import { useEffect, useState } from 'react';
import { Box, Flex, Text, Button, VStack, Spinner, Center, Badge } from '@chakra-ui/react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

interface StatsResponse {
    playerId: number;
    gamesPlayed: number;
    wins: number;
    losses: number;
    draws: number;
    elo: number;
}

interface GameHistoryEntry {
    id: number;
    whitePlayerId: number;
    whitePlayerUsername: string;
    blackPlayerId: number;
    blackPlayerUsername: string;
    result: 'WHITE_WIN' | 'BLACK_WIN' | 'DRAW';
    finalFen: string;
    startedAt: string;
    finishedAt: string;
}

interface ProfileLocationState {
    username?: string;
    from?: string;
}

export default function ProfilePage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { userId } = useParams<{ userId?: string }>();
    const { user } = useAuth();
    const locationState = (location.state as ProfileLocationState | null) ?? null;
    const viewedUserId = userId ? Number(userId) : user?.id;
    const isOwnProfile = !!user && viewedUserId === user.id;
    const invalidProfile = !viewedUserId || Number.isNaN(viewedUserId);
    const [stats, setStats] = useState<StatsResponse | null>(null);
    const [history, setHistory] = useState<GameHistoryEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (invalidProfile) {
            return;
        }

        let cancelled = false;

        const loadProfileData = async () => {
            if (!cancelled) {
                setLoading(true);
            }

            try {
                const [statsResponse, historyResponse] = await Promise.all([
                    api.get<StatsResponse>(`/users/${viewedUserId}/stats`),
                    api.get<GameHistoryEntry[]>(`/games/history/${viewedUserId}`),
                ]);

                if (!cancelled) {
                    setStats(statsResponse.data);
                    setHistory(historyResponse.data);
                    setError('');
                }
            } catch {
                if (!cancelled) {
                    setError('Could not load profile data.');
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        void loadProfileData();

        return () => {
            cancelled = true;
        };
    }, [invalidProfile, viewedUserId]);

    const inferredUsername = history.find((entry) => entry.whitePlayerId === viewedUserId)?.whitePlayerUsername
        ?? history.find((entry) => entry.blackPlayerId === viewedUserId)?.blackPlayerUsername
        ?? null;

    const displayedUsername = isOwnProfile
        ? user?.username
        : locationState?.username ?? inferredUsername ?? `Player #${viewedUserId}`;

    const getResultLabel = (entry: GameHistoryEntry) => {
        if (!viewedUserId) {
            return entry.result === 'DRAW' ? 'Draw' : entry.result;
        }

        if (entry.result === 'DRAW') {
            return 'Draw';
        }

        const isWhite = viewedUserId === entry.whitePlayerId;
        const didWin =
            (entry.result === 'WHITE_WIN' && isWhite) ||
            (entry.result === 'BLACK_WIN' && !isWhite);

        return didWin ? 'Win' : 'Loss';
    };

    const getResultColor = (label: string) => {
        if (label === 'Win') return 'green';
        if (label === 'Loss') return 'red';
        return 'gray';
    };

    const getOpponentName = (entry: GameHistoryEntry) => {
        if (!viewedUserId) {
            return entry.whitePlayerUsername;
        }

        return viewedUserId === entry.whitePlayerId
            ? entry.blackPlayerUsername
            : entry.whitePlayerUsername;
    };

    const displayError = invalidProfile ? 'Could not determine which profile to load.' : error;

    return (
        <Flex height="100vh" alignItems="center" justifyContent="center" bg="gray.50">
            <Box p={8} maxWidth="720px" width="100%" bg="white" borderWidth={1} borderRadius={8} boxShadow="lg">
                <Flex justify="space-between" align="center" mb={6}>
                    <Text fontSize="2xl" fontWeight="bold">Profile</Text>
                    <Button size="sm" onClick={() => navigate(locationState?.from ?? '/menu')}>
                        {locationState?.from === '/leaderboard' ? 'Back to Leaderboard' : 'Back to Menu'}
                    </Button>
                </Flex>

                {displayError && (
                    <Text color="red.500" fontSize="sm" mb={4} textAlign="center">
                        {displayError}
                    </Text>
                )}

                {!invalidProfile && loading ? (
                    <Center py={10}>
                        <Spinner />
                    </Center>
                ) : (
                    <VStack align="stretch" gap={4}>
                        <Text><strong>Username:</strong> {displayedUsername}</Text>
                        {isOwnProfile && <Text><strong>Email:</strong> {user?.email}</Text>}

                        <Box p={4} bg="gray.100" borderRadius="md">
                            <Text fontWeight="bold" mb={2}>Statistics</Text>
                            <Text>Games Played: {stats?.gamesPlayed ?? 0}</Text>
                            <Text>Wins: {stats?.wins ?? 0}</Text>
                            <Text>Losses: {stats?.losses ?? 0}</Text>
                            <Text>Draws: {stats?.draws ?? 0}</Text>
                            <Text>ELO Rating: {stats?.elo ?? 1200}</Text>
                        </Box>

                        <Box p={4} bg="gray.50" borderWidth={1} borderRadius="md">
                            <Text fontWeight="bold" mb={3}>Game History</Text>

                            {history.length === 0 ? (
                                <Text color="gray.500">No completed games yet.</Text>
                            ) : (
                                <VStack align="stretch" gap={3}>
                                    {history.map((entry) => {
                                        const resultLabel = getResultLabel(entry);

                                        return (
                                            <Box key={entry.id} p={3} bg="white" borderWidth={1} borderRadius="md">
                                                <Flex justify="space-between" align="center" mb={2}>
                                                    <Text fontWeight="semibold">
                                                        vs {getOpponentName(entry)}
                                                    </Text>
                                                    <Badge colorScheme={getResultColor(resultLabel)}>
                                                        {resultLabel}
                                                    </Badge>
                                                </Flex>
                                                <Text fontSize="sm" color="gray.600">
                                                    Finished: {new Date(entry.finishedAt).toLocaleString()}
                                                </Text>
                                            </Box>
                                        );
                                    })}
                                </VStack>
                            )}
                        </Box>
                    </VStack>
                )}
            </Box>
        </Flex>
    );
}
