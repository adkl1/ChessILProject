import { Box, Flex, Text, Button, VStack } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';

export default function LeaderboardPage() {
    const navigate = useNavigate();

    return (
        <Flex height="100vh" alignItems="center" justifyContent="center" bg="gray.50">
            <Box p={8} maxWidth="500px" width="100%" bg="white" borderWidth={1} borderRadius={8} boxShadow="lg">
                <Flex justify="space-between" align="center" mb={6}>
                    <Text fontSize="2xl" fontWeight="bold">Leaderboard</Text>
                    <Button size="sm" onClick={() => navigate('/menu')}>Back to Menu</Button>
                </Flex>
                <VStack align="stretch" gap={2}>
                    <Box p={3} borderWidth={1} borderRadius="md" display="flex" justifyContent="space-between">
                        <Text fontWeight="bold">1. Grandmaster</Text>
                        <Text color="blue.500">2800 ELO</Text>
                    </Box>
                    <Box p={3} borderWidth={1} borderRadius="md" display="flex" justifyContent="space-between">
                        <Text fontWeight="bold">2. Master</Text>
                        <Text color="blue.500">2400 ELO</Text>
                    </Box>
                    <Text textAlign="center" color="gray.400" mt={4}>(Live Data coming soon)</Text>
                </VStack>
            </Box>
        </Flex>
    );
}