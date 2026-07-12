import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Lobby from './pages/Lobby.jsx';
import Room from './pages/Room.jsx';
import Reports from './pages/Reports.jsx';

function Protected({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
      <Route path="/lobby/:id" element={<Protected><Lobby /></Protected>} />
      <Route path="/room/:id" element={<Protected><Room /></Protected>} />
      <Route path="/reports/:sessionId" element={<Protected><Reports /></Protected>} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
