import { useState, useMemo } from 'react';
import { Button, Input, Flex, Text } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import countryList from 'react-select-country-list';

export default function RegisterForm() {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [country, setCountry] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();
    const { login, fetchMe } = useAuth();

    const options = useMemo(() => countryList().getData(), []);

    const handleRegister = async () => {
        setError('');
        setLoading(true);
        try {
            // NOTE: 'country' is stored locally but not sent to the server
            // until Adiel adds the field to RegisterRequest DTO.
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

            <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                style={{
                    padding: '8px',
                    borderRadius: '6px',
                    border: '1px solid #E2E8F0',
                    backgroundColor: 'white',
                    fontSize: '16px',
                }}
            >
                <option value="" disabled>Select Country (optional)</option>
                {options.map((opt: { value: string; label: string }) => (
                    <option key={opt.value} value={opt.label}>
                        {opt.label}
                    </option>
                ))}
            </select>

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