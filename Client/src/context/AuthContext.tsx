import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import api from '../services/api';

// Shape of the logged-in user (matches GET /api/users/me response)
export interface User {
    id: number;
    username: string;
    email: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    login: (token: string, user?: User) => void;
    logout: () => void;
    fetchMe: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    // Rehydrate from localStorage on first render so a page refresh keeps you logged in
    const [token, setToken] = useState<string | null>(() => localStorage.getItem('jwt_token'));
    const [user, setUser] = useState<User | null>(() => {
        const stored = localStorage.getItem('chess_user');
        return stored ? JSON.parse(stored) : null;
    });

    const logout = useCallback(() => {
        localStorage.removeItem('jwt_token');
        localStorage.removeItem('chess_user');
        setToken(null);
        setUser(null);
    }, []);

    const login = useCallback((newToken: string, newUser?: User) => {
        localStorage.setItem('jwt_token', newToken);
        setToken(newToken);
        if (newUser) {
            localStorage.setItem('chess_user', JSON.stringify(newUser));
            setUser(newUser);
        }
    }, []);

    /**
     * Calls GET /users/me to get the full user profile from the backend.
     * Should be called after login/register to hydrate user data.
     */
    const fetchMe = useCallback(async (): Promise<User | null> => {
        try {
            const { data } = await api.get<User>('/users/me');
            localStorage.setItem('chess_user', JSON.stringify(data));
            setUser(data);
            return data;
        } catch (err) {
            console.error('Failed to fetch user profile:', err);
            return null;
        }
    }, []);

    // On mount: if we have a token but no user data, fetch profile from server
    useEffect(() => {
        if (token && !user) {
            fetchMe();
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // 401 response interceptor — auto-logout on expired/invalid token
    useEffect(() => {
        const interceptorId = api.interceptors.response.use(
            (response) => response,
            (error) => {
                if (error.response?.status === 401) {
                    logout();
                }
                return Promise.reject(error);
            }
        );
        return () => {
            api.interceptors.response.eject(interceptorId);
        };
    }, [logout]);

    return (
        <AuthContext.Provider value={{ user, token, isAuthenticated: !!token, login, logout, fetchMe }}>
            {children}
        </AuthContext.Provider>
    );
}

// Convenience hook — throws if used outside <AuthProvider>
export function useAuth(): AuthContextType {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
    return ctx;
}
