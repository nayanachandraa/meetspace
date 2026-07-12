import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext.jsx';

const API_URL = import.meta.env.VITE_API_URL;

export default function Lobby() {
  const { id } = useParams();
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [roomTitle, setRoomTitle] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`${API_URL}/api/rooms/${id}`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        setRoomTitle(res.data.room.title);
        setRoomCode(res.data.room.roomCode);
      } catch (err) {
        setError(err.response?.data?.message || 'Could not load room');
      }

      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setStream(s);
        if (videoRef.current) videoRef.current.srcObject = s;
      } catch {
        setError('Camera/microphone permission denied');
      }
    })();

    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const enterRoom = () => {
    if (stream) stream.getTracks().forEach((t) => t.stop());
    navigate(`/room/${id}`);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="lobby-page">
      <h2>{roomTitle || 'Meeting Lobby'}</h2>

      {roomCode && (
        <div className="room-code-box">
          <span>Room code: <strong>{roomCode}</strong></span>
          <button onClick={copyCode}>{copied ? 'Copied!' : 'Copy'}</button>
        </div>
      )}

      <div className="lobby-preview">
        <video ref={videoRef} autoPlay muted playsInline />
      </div>
      {error && <p className="error-text">{error}</p>}
      <button className="primary" onClick={enterRoom} disabled={!!error && !stream}>
        Join Meeting
      </button>
    </div>
  );
}
