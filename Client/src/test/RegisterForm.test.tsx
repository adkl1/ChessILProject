/**
 * RegisterForm.test.tsx
 *
 * Tests the registration form:
 *  - renders all fields
 *  - sends username/email/password to server
 *  - saves JWT and navigates to /lobby on success
 *  - shows server error messages (e.g. "Username already taken")
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import MockAdapter from 'axios-mock-adapter';
import { vi } from 'vitest';

import RegisterForm from '../components/RegisterForm';
import { AuthProvider } from '../context/AuthContext';
import api from '../services/api';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
    return { ...actual, useNavigate: () => mockNavigate };
});

const makeJwt = (email: string) => {
    const payload = btoa(JSON.stringify({ sub: email, exp: 9999999999 }));
    return `fakeheader.${payload}.fakesig`;
};

let mock: MockAdapter;

beforeEach(() => {
    mock = new MockAdapter(api);
    mockNavigate.mockReset();
    localStorage.clear();
});

afterEach(() => {
    mock.restore();
});

function renderForm() {
    return render(
        <ChakraProvider value={defaultSystem}>
            <MemoryRouter>
                <AuthProvider>
                    <RegisterForm />
                </AuthProvider>
            </MemoryRouter>
        </ChakraProvider>,
    );
}

describe('RegisterForm', () => {
    it('renders username, email, password fields and a create account button', () => {
        renderForm();
        expect(screen.getByPlaceholderText(/username/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
    });

    it('sends username, email, and password to the server', async () => {
        const token = makeJwt('newuser@example.com');
        mock.onPost('/auth/register').reply(200, {
            token,
            message: 'User registered successfully',
        });

        renderForm();
        const user = userEvent.setup();

        await user.type(screen.getByPlaceholderText(/username/i), 'newuser');
        await user.type(screen.getByPlaceholderText(/email/i), 'newuser@example.com');
        await user.type(screen.getByPlaceholderText(/password/i), 'secure123');
        await user.click(screen.getByRole('button', { name: /create account/i }));

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/lobby');
        });

        const body = JSON.parse(mock.history.post[0].data);
        // These three fields MUST be present
        expect(body.username).toBe('newuser');
        expect(body.email).toBe('newuser@example.com');
        expect(body.password).toBe('secure123');
    });

    it('saves JWT and user info to localStorage on success', async () => {
        const token = makeJwt('newuser@example.com');
        mock.onPost('/auth/register').reply(200, {
            token,
            message: 'User registered successfully',
        });

        renderForm();
        const user = userEvent.setup();

        await user.type(screen.getByPlaceholderText(/username/i), 'newuser');
        await user.type(screen.getByPlaceholderText(/email/i), 'newuser@example.com');
        await user.type(screen.getByPlaceholderText(/password/i), 'secure123');
        await user.click(screen.getByRole('button', { name: /create account/i }));

        await waitFor(() => {
            expect(localStorage.getItem('jwt_token')).toBe(token);
            const stored = JSON.parse(localStorage.getItem('chess_user') ?? '{}');
            // Username should be the one the user typed (not email-prefix)
            expect(stored.username).toBe('newuser');
        });
    });

    it('shows error when username is already taken', async () => {
        mock.onPost('/auth/register').reply(400, { message: 'Username is already taken' });

        renderForm();
        const user = userEvent.setup();

        await user.type(screen.getByPlaceholderText(/username/i), 'taken');
        await user.type(screen.getByPlaceholderText(/email/i), 'taken@example.com');
        await user.type(screen.getByPlaceholderText(/password/i), 'password123');
        await user.click(screen.getByRole('button', { name: /create account/i }));

        await waitFor(() => {
            expect(screen.getByText('Username is already taken')).toBeInTheDocument();
        });

        expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('shows error when email is already in use', async () => {
        mock.onPost('/auth/register').reply(400, { message: 'Email is already in use' });

        renderForm();
        const user = userEvent.setup();

        await user.type(screen.getByPlaceholderText(/username/i), 'someone');
        await user.type(screen.getByPlaceholderText(/email/i), 'dup@example.com');
        await user.type(screen.getByPlaceholderText(/password/i), 'password123');
        await user.click(screen.getByRole('button', { name: /create account/i }));

        await waitFor(() => {
            expect(screen.getByText('Email is already in use')).toBeInTheDocument();
        });
    });
});
