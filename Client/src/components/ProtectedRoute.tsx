import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

/**
 * Wraps any route that requires authentication.
 * Redirects to /login if there is no valid JWT in context.
 */
export default function ProtectedRoute({ children }: Props) {
    const { isAuthenticated } = useAuth();

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
}
