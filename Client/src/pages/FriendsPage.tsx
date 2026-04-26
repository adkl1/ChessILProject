import { Box, Flex, Text, Button, VStack, HStack, Input } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';

export default function FriendsPage() {
    const navigate = useNavigate();

    return (
        <Flex height="100vh" alignItems="center" justifyContent="center" bg="gray.50">
            <Box p={8} maxWidth="500px" width="100%" bg="white" borderWidth={1} borderRadius={8} boxShadow="lg">
                <Flex justify="space-between" align="center" mb={6}>
                    <Text fontSize="2xl" fontWeight="bold">Friends</Text>
                    <Button size="sm" onClick={() => navigate('/menu')}>Back to Menu</Button>
                </Flex>
                
                <HStack mb={6}>
                    <Input placeholder="Search username to add..." />
                    <Button colorScheme="blue">Add</Button>
                </HStack>

                <VStack align="stretch" gap={4}>
                    <Text fontWeight="bold">Friend List</Text>
                    <Text color="gray.500" textAlign="center" py={4}>No friends yet.</Text>
                    
                    <Text fontWeight="bold" mt={4}>Pending Requests</Text>
                    <Text color="gray.500" textAlign="center" py={4}>No pending requests.</Text>
                </VStack>
            </Box>
        </Flex>
    );
}