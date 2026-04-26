import { useEffect, useState } from 'react';
import { Box, Flex, Text, Button, VStack, Spinner, Center, Badge } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

interface LeaderboardEntry {
    playerId: number;
    username: string;
    elo: number;
    gamesPlayed: number;
    wins: number;
    losses: number;
    draws: number;
}

export default function LeaderboardPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;

        const loadLeaderboard = async () => {
            try {
                const { data } = await api.get<LeaderboardEntry[]>('/users/leaderboard', {
                    params: { limit: 10 },
                });

                if (!cancelled) {
                    setEntries(data);
                    setError('');
                }
            } catch {
                if (!cancelled) {
                    setError('Could not load leaderboard.');
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        void loadLeaderboard();

        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <Flex height="100vh" alignItems="center" justifyContent="center" bg="gray.50">
            <Box p={8} maxWidth="640px" width="100%" bg="white" borderWidth={1} borderRadius={8} boxShadow="lg">
                <Flex justify="space-between" align="center" mb={6}>
                    <Text fontSize="2xl" fontWeight="bold">Leaderboard</Text>
                    <Button size="sm" onClick={() => navigate('/menu')}>Back to Menu</Button>
                </Flex>

                {error && (
                    <Text color="red.500" fontSize="sm" mb={4} textAlign="center">
                        {error}
                    </Text>
                )}

                {loading ? (
                    <Center py={10}>
                        <Spinner />
                    </Center>
                ) : entries.length === 0 ? (
                    <Text textAlign="center" color="gray.500" py={8}>
                        No leaderboard data yet.
                    </Text>
                ) : (
                    <VStack align="stretch" gap={3}>
                        {entries.map((entry, index) => {
                            const isCurrentUser = user?.id === entry.playerId;

                            return (
                                <Box
                                    key={entry.playerId}
                                    p={4}
                                    borderWidth={1}
                                    borderRadius="md"
                                    bg={isCurrentUser ? 'blue.50' : 'white'}
                                    borderColor={isCurrentUser ? 'blue.300' : 'gray.200'}
                                >
                                    <Flex justify="space-between" align="center" mb={2}>
                                        <Flex align="center" gap={3}>
                                            <Button
                                                variant="ghost"
                                                p={0}
                                                h="auto"
                                                minW="auto"
                                                fontWeight="bold"
                                                fontSize="lg"
                                                onClick={() => navigate(`/profile/${entry.playerId}`, {
                                                    state: {
                                                        username: entry.username,
                                                        from: '/leaderboard',
                                                    },
                                                })}
                                            >
                                                {index + 1}. {entry.username}
                                            </Button>
                                            {isCurrentUser && <Badge colorScheme="blue">You</Badge>}
                                        </Flex>
                                        <Text color="blue.500" fontWeight="bold">
                                            {entry.elo} ELO
                                        </Text>
                                    </Flex>

                                    <Flex justify="space-between" wrap="wrap" gap={2}>
                                        <Text fontSize="sm" color="gray.600">
                                            Games: {entry.gamesPlayed}
                                        </Text>
                                        <Text fontSize="sm" color="gray.600">
                                            Wins: {entry.wins}
                                        </Text>
                                        <Text fontSize="sm" color="gray.600">
                                            Losses: {entry.losses}
                                        </Text>
                                        <Text fontSize="sm" color="gray.600">
                                            Draws: {entry.draws}
                                        </Text>
                                    </Flex>
                                </Box>
                            );
                        })}
                    </VStack>
                )}
            </Box>
        </Flex>
    );
}
