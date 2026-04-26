import { render, screen, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../context/AuthContext';

function AuthDisplay() {
    const { isAuthenticated, user, token } = useAuth();
    return (
        <div>
            <span data-testid="authenticated">{String(isAuthenticated)}</span>
            <span data-testid="username">{user?.username ?? 'none'}</span>
            <span data-testid="email">{user?.email ?? 'none'}</span>
            <span data-testid="token">{token ?? 'none'}</span>
        </div>
    );
}

function LoginButton() {
    const { login } = useAuth();
    return (
        <button
            onClick={() => login('test.jwt.token', { id: 1, username: 'rotem', email: 'rotem@test.com' })}
        >
            Login
        </button>
    );
}

function LogoutButton() {
    const { logout } = useAuth();
    return <button onClick={logout}>Logout</button>;
}

beforeEach(() => {
    localStorage.clear();
});

describe('AuthContext', () => {
    it('starts unauthenticated when localStorage is empty', () => {
        render(
            <AuthProvider>
                <AuthDisplay />
            </AuthProvider>,
        );

        expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
        expect(screen.getByTestId('username')).toHaveTextContent('none');
        expect(screen.getByTestId('token')).toHaveTextContent('none');
    });

    it('becomes authenticated after login() is called', async () => {
        render(
            <AuthProvider>
                <LoginButton />
                <AuthDisplay />
            </AuthProvider>,
        );

        expect(screen.getByTestId('authenticated')).toHaveTextContent('false');

        await act(async () => {
            screen.getByText('Login').click();
        });

        expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
        expect(screen.getByTestId('username')).toHaveTextContent('rotem');
        expect(screen.getByTestId('email')).toHaveTextContent('rotem@test.com');
        expect(screen.getByTestId('token')).toHaveTextContent('test.jwt.token');
    });

    it('persists token to localStorage on login', async () => {
        render(
            <AuthProvider>
                <LoginButton />
                <AuthDisplay />
            </AuthProvider>,
        );

        await act(async () => {
            screen.getByText('Login').click();
        });

        expect(localStorage.getItem('jwt_token')).toBe('test.jwt.token');
        expect(JSON.parse(localStorage.getItem('chess_user') ?? '{}')).toEqual({
            id: 1,
            username: 'rotem',
            email: 'rotem@test.com',
        });
    });

    it('rehydrates from localStorage on mount', () => {
        localStorage.setItem('jwt_token', 'existing.token');
        localStorage.setItem(
            'chess_user',
            JSON.stringify({ id: 2, username: 'adiel', email: 'adiel@test.com' }),
        );

        render(
            <AuthProvider>
                <AuthDisplay />
            </AuthProvider>,
        );

        expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
        expect(screen.getByTestId('username')).toHaveTextContent('adiel');
        expect(screen.getByTestId('token')).toHaveTextContent('existing.token');
    });

    it('clears state and localStorage on logout', async () => {
        localStorage.setItem('jwt_token', 'existing.token');
        localStorage.setItem(
            'chess_user',
            JSON.stringify({ id: 1, username: 'rotem', email: 'rotem@test.com' }),
        );

        render(
            <AuthProvider>
                <LogoutButton />
                <AuthDisplay />
            </AuthProvider>,
        );

        expect(screen.getByTestId('authenticated')).toHaveTextContent('true');

        await act(async () => {
            screen.getByText('Logout').click();
        });

        expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
        expect(screen.getByTestId('username')).toHaveTextContent('none');
        expect(localStorage.getItem('jwt_token')).toBeNull();
        expect(localStorage.getItem('chess_user')).toBeNull();
    });
});
