import { Box, Flex, Text, Button, VStack } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProfilePage() {
    const navigate = useNavigate();
    const { user } = useAuth();

    return (
        <Flex height="100vh" alignItems="center" justifyContent="center" bg="gray.50">
            <Box p={8} maxWidth="500px" width="100%" bg="white" borderWidth={1} borderRadius={8} boxShadow="lg">
                <Flex justify="space-between" align="center" mb={6}>
                    <Text fontSize="2xl" fontWeight="bold">Profile</Text>
                    <Button size="sm" onClick={() => navigate('/menu')}>Back to Menu</Button>
                </Flex>
                <VStack align="stretch" gap={4}>
                    <Text><strong>Username:</strong> {user?.username}</Text>
                    <Text><strong>Email:</strong> {user?.email}</Text>
                    <Text><strong>User ID:</strong> {user?.id}</Text>
                    <Box p={4} bg="gray.100" borderRadius="md">
                        <Text fontWeight="bold" mb={2}>Statistics</Text>
                        <Text>Games Played: 0</Text>
                        <Text>Wins: 0</Text>
                        <Text>Losses: 0</Text>
                        <Text>Draws: 0</Text>
                        <Text>ELO Rating: 1200</Text>
                    </Box>
                    <Button colorScheme="blue" variant="outline">Game History</Button>
                </VStack>
            </Box>
        </Flex>
    );
}