/**
 * ProtectedRoute.test.tsx
 *
 * Tests that:
 *  - an unauthenticated user is redirected to /login
 *  - an authenticated user sees the protected content
 */
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import ProtectedRoute from '../components/ProtectedRoute';

function setup(initialPath: string, authenticated: boolean) {
    if (authenticated) {
        localStorage.setItem('jwt_token', 'some.valid.token');
        localStorage.setItem(
            'chess_user',
            JSON.stringify({ username: 'rotem', email: 'rotem@test.com' }),
        );
    } else {
        localStorage.clear();
    }

    return render(
        <AuthProvider>
            <MemoryRouter initialEntries={[initialPath]}>
                <Routes>
                    <Route path="/login" element={<div>Login Page</div>} />
                    <Route
                        path="/lobby"
                        element={
                            <ProtectedRoute>
                                <div>Lobby Page</div>
                            </ProtectedRoute>
                        }
                    />
                </Routes>
            </MemoryRouter>
        </AuthProvider>,
    );
}

beforeEach(() => localStorage.clear());

describe('ProtectedRoute', () => {
    it('redirects to /login when user is NOT authenticated', () => {
        setup('/lobby', false);
        expect(screen.getByText('Login Page')).toBeInTheDocument();
        expect(screen.queryByText('Lobby Page')).not.toBeInTheDocument();
    });

    it('renders protected content when user IS authenticated', () => {
        setup('/lobby', true);
        expect(screen.getByText('Lobby Page')).toBeInTheDocument();
        expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
    });
});
