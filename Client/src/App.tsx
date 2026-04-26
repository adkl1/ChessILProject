import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AuthPage from './pages/AuthPage';
import MenuPage from './pages/MenuPage';
import LobbyPage from './pages/LobbyPage';
import RoomPage from './pages/RoomPage';
import GamePage from './pages/GamePage';
import ProfilePage from './pages/ProfilePage';
import LeaderboardPage from './pages/LeaderboardPage';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Navigate to="/login" />} />
                <Route path="/login" element={<AuthPage />} />
                <Route path="/menu" element={<ProtectedRoute><MenuPage /></ProtectedRoute>} />
                <Route path="/lobby" element={<ProtectedRoute><LobbyPage /></ProtectedRoute>} />
                <Route path="/room/:id" element={<ProtectedRoute><RoomPage /></ProtectedRoute>} />
                <Route path="/game/:id" element={<ProtectedRoute><GamePage /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                <Route path="/profile/:userId" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                <Route path="/leaderboard" element={<ProtectedRoute><LeaderboardPage /></ProtectedRoute>} />
            </Routes>
        </Router>
    );
}

export default App;
