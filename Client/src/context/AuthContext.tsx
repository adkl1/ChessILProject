import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import api from '../services/api';

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

    useEffect(() => {
        let stopd = false;

        const loadMe = async () => {
            const usr = await fetchMe();
            if (stopd || !usr) return;
        };

        if (token && !user) {
            void loadMe();
        }

        return () => {
            stopd = true;
        };
    }, [fetchMe, token, user]);

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

export function useAuth(): AuthContextType {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
    return ctx;
}
