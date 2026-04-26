import { useState } from 'react';
import { Button, Input, Flex, Text } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function LoginForm() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();
    const { login, fetchMe } = useAuth();

    const handleLogin = async () => {
        setError('');
        setLoading(true);
        try {
            const response = await api.post('/auth/login', { email, password });
            const { token } = response.data;

            // Save the token first so subsequent requests are authenticated
            login(token);

            // Fetch the real user profile from the backend
            const user = await fetchMe();
            if (!user) {
                setError('Logged in but could not load user profile.');
                return;
            }

            navigate('/menu');
        } catch (err: unknown) {
            const msg =
                (err as { response?: { data?: { message?: string } } })
                    ?.response?.data?.message ?? 'Invalid email or password.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleLogin();
    };

    return (
        <Flex direction="column" gap={4} width="100%">
            <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={handleKeyDown}
            />
            <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
            />
            {error && (
                <Text color="red.500" fontSize="sm">
                    {error}
                </Text>
            )}
            <Button
                bg="blue.500"
                color="white"
                onClick={handleLogin}
                width="100%"
                loading={loading}
                loadingText="Logging in…"
            >
                Login
            </Button>
        </Flex>
    );
}