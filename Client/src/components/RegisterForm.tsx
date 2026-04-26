import { useState } from 'react';
import { Button, Input, Flex, Text } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function RegisterForm() {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();
    const { login, fetchMe } = useAuth();

    const handleRegister = async () => {
        setError('');
        setLoading(true);
        try {
            const response = await api.post('/auth/register', {
                username,
                email,
                password,
            });
            const { token } = response.data;

            // Save the token first so subsequent requests are authenticated
            login(token);

            // Fetch the real user profile from the backend
            const user = await fetchMe();
            if (!user) {
                setError('Registered but could not load user profile.');
                return;
            }

            navigate('/menu');
        } catch (err: unknown) {
            const msg =
                (err as { response?: { data?: { message?: string } } })
                    ?.response?.data?.message ?? 'Registration failed. Please try again.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Flex direction="column" gap={4} width="100%">
            <Input
                placeholder="Username (3–20 characters)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
            />
            <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
            />
            <Input
                type="password"
                placeholder="Password (min 6 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
            />

            {error && (
                <Text color="red.500" fontSize="sm">
                    {error}
                </Text>
            )}

            <Button
                bg="green.500"
                color="white"
                onClick={handleRegister}
                width="100%"
                loading={loading}
                loadingText="Creating account…"
            >
                Create Account
            </Button>
        </Flex>
    );
}
