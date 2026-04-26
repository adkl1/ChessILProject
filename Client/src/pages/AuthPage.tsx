import { useState } from 'react';
import { Box, Flex, Text, Button } from '@chakra-ui/react';
import LoginForm from '../components/LoginForm';
import RegisterForm from '../components/RegisterForm';

export default function AuthPage() {
    // Toggle between the login and register views
    const [view, setView] = useState<'login' | 'register'>('login');

    return (
        <Flex height="100vh" alignItems="center" justifyContent="center" bg="gray.50">
            <Box p={8} maxWidth="400px" borderWidth={1} borderRadius={8} boxShadow="lg" bg="white" width="100%">
                <Text fontSize="2xl" fontWeight="bold" textAlign="center" mb={6}>
                    Welcome to ChessIL
                </Text>

                {/* Show the appropriate form based on the current state */}
                {view === 'login' ? <LoginForm /> : <RegisterForm />}

                {/* Switch between the forms */}
                <Flex justifyContent="center" mt={4}>
                    <Button variant="ghost" onClick={() => setView(view === 'login' ? 'register' : 'login')}>
                        {view === 'login' ? 'Need an account? Register' : 'Already have an account? Login'}
                    </Button>
                </Flex>
            </Box>
        </Flex>
    );
}