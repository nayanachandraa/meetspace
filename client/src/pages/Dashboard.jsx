import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext.jsx';

const API_URL = import.meta.env.VITE_API_URL;

export default function Dashboard() {
  const { user, accessToken, logout } = useAuth();
  const [title, setTitle] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const createRoom = async () => {
    setError('');
    try {
      const res = await axios.post(
        `${API_URL}/api/rooms`,
        { title: title || 'Untitled Meeting' },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      navigate(`/lobby/${res.data.roomId}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create room');
    }
  };

  const joinRoom = async () => {
    if (!joinCode.trim()) return;
    setError('');
    try {
      await axios.get(`${API_URL}/api/rooms/${joinCode.trim()}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      navigate(`/lobby/${joinCode.trim()}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Room not found');
    }
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h2>MeetSpace</h2>
        <div className="user-badge">
          <span>{user?.name}</span>
          <button onClick={logout}>Log out</button>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="panel">
          <h3>Start a new meeting</h3>
          <input placeholder="Meeting title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} />
          <button className="primary" onClick={createRoom}>Create Meeting</button>
        </div>

        <div className="panel">
          <h3>Join a meeting</h3>
          <input placeholder="Room code" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} />
          <button className="primary" onClick={joinRoom}>Join</button>
        </div>

        {error && <p className="error-text">{error}</p>}
      </main>
    </div>
  );
}
