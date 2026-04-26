import { Box, Button, Flex, Text, VStack } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function MenuPage() {
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <Flex height="100vh" alignItems="center" justifyContent="center" bg="gray.50">
            <Box p={8} maxWidth="400px" width="100%" bg="white" borderWidth={1} borderRadius={8} boxShadow="lg">
                <Flex justifyContent="space-between" alignItems="center" mb={6}>
                    <Text fontSize="3xl" fontWeight="bold">Main Menu</Text>
                    <Button size="xs" variant="ghost" colorScheme="red" onClick={handleLogout}>
                        Logout
                    </Button>
                </Flex>

                <Text mb={6} textAlign="center" color="gray.600">
                    Welcome back, <strong>{user?.username}</strong>!
                </Text>

                <VStack gap={4} align="stretch">
                    <Button colorScheme="blue" size="lg" onClick={() => navigate('/lobby')}>
                        Play / Rooms
                    </Button>
                    <Button colorScheme="teal" size="lg" onClick={() => navigate('/leaderboard')}>
                        Leaderboard
                    </Button>
                    <Button colorScheme="gray" size="lg" onClick={() => navigate('/profile')}>
                        Profile
                    </Button>
                </VStack>
            </Box>
        </Flex>
    );
}
