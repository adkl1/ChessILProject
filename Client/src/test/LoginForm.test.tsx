import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import MockAdapter from 'axios-mock-adapter';
import { vi } from 'vitest';

import LoginForm from '../components/LoginForm';
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
                    <LoginForm />
                </AuthProvider>
            </MemoryRouter>
        </ChakraProvider>,
    );
}

describe('LoginForm', () => {
    it('renders email input, password input and login button', () => {
        renderForm();
        expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
    });

    it('sends correct payload to POST /auth/login and navigates to /menu', async () => {
        const token = makeJwt('rotem@example.com');
        mock.onPost('/auth/login').reply(200, { token, message: 'Login successful' });
        mock.onGet('/users/me').reply(200, { id: 1, username: 'rotem', email: 'rotem@example.com' });

        renderForm();
        const user = userEvent.setup();

        await user.type(screen.getByPlaceholderText('Email'), 'rotem@example.com');
        await user.type(screen.getByPlaceholderText('Password'), 'mypassword');
        await user.click(screen.getByRole('button', { name: /login/i }));

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/menu');
            expect(localStorage.getItem('jwt_token')).toBe(token);
        });

        const requestBody = JSON.parse(mock.history.post[0].data);
        expect(requestBody).toEqual({ email: 'rotem@example.com', password: 'mypassword' });
    });

    it('stores the backend profile after login', async () => {
        const token = makeJwt('rotem@example.com');
        mock.onPost('/auth/login').reply(200, { token, message: 'Login successful' });
        mock.onGet('/users/me').reply(200, { id: 1, username: 'rotem', email: 'rotem@example.com' });

        renderForm();
        const user = userEvent.setup();

        await user.type(screen.getByPlaceholderText('Email'), 'rotem@example.com');
        await user.type(screen.getByPlaceholderText('Password'), 'password');
        await user.click(screen.getByRole('button', { name: /login/i }));

        await waitFor(() => {
            const storedUser = JSON.parse(localStorage.getItem('chess_user') ?? '{}');
            expect(storedUser.id).toBe(1);
            expect(storedUser.username).toBe('rotem');
            expect(storedUser.email).toBe('rotem@example.com');
        });
    });

    it('shows error message when server returns 400 / invalid credentials', async () => {
        mock.onPost('/auth/login').reply(400, { message: 'Invalid email or password' });

        renderForm();
        const user = userEvent.setup();

        await user.type(screen.getByPlaceholderText('Email'), 'bad@example.com');
        await user.type(screen.getByPlaceholderText('Password'), 'wrongpass');
        await user.click(screen.getByRole('button', { name: /login/i }));

        await waitFor(() => {
            expect(screen.getByText('Invalid email or password')).toBeInTheDocument();
        });

        expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('shows generic error when server returns no message body', async () => {
        mock.onPost('/auth/login').reply(500);

        renderForm();
        const user = userEvent.setup();

        await user.type(screen.getByPlaceholderText('Email'), 'x@x.com');
        await user.type(screen.getByPlaceholderText('Password'), 'pass');
        await user.click(screen.getByRole('button', { name: /login/i }));

        await waitFor(() => {
            expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
        });
    });

    it('submits the form when Enter is pressed in the password field', async () => {
        const token = makeJwt('rotem@example.com');
        mock.onPost('/auth/login').reply(200, { token, message: 'Login successful' });
        mock.onGet('/users/me').reply(200, { id: 1, username: 'rotem', email: 'rotem@example.com' });

        renderForm();
        const user = userEvent.setup();

        await user.type(screen.getByPlaceholderText('Email'), 'rotem@example.com');
        await user.type(screen.getByPlaceholderText('Password'), 'mypassword{Enter}');

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/menu');
        });
    });
});
