import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext.jsx';
import { useSocket } from '../hooks/useSocket.js';
import { useWebRTC } from '../hooks/useWebRTC.js';
import VideoGrid from '../components/VideoGrid.jsx';
import ControlsBar from '../components/ControlsBar.jsx';
import ChatPanel from '../components/ChatPanel.jsx';
import Whiteboard from '../components/Whiteboard.jsx';
import UserList from '../components/UserList.jsx';

const API_URL = import.meta.env.VITE_API_URL;

export default function Room() {
  const { id } = useParams();
  const { user, accessToken } = useAuth();
  const navigate = useNavigate();
  const socketRef = useSocket();
  const [isHost, setIsHost] = useState(false);
  const [activePanel, setActivePanel] = useState(null); // 'chat' | 'whiteboard' | 'people' | null
  const [networkWarning, setNetworkWarning] = useState(false);

  const {
    localStream, remoteStreams, participants, connectionState,
    init, toggleAudio, toggleVideo, shareScreen, leaveRoom
  } = useWebRTC(socketRef, id, user?.id, user?.name);

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`${API_URL}/api/rooms/${id}`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        setIsHost(res.data.isHost);
      } catch {
        navigate('/dashboard');
        return;
      }
      init();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    setNetworkWarning(connectionState === 'degraded' || connectionState === 'error');
  }, [connectionState]);

  const handleLeave = () => {
    leaveRoom();
    navigate('/dashboard');
  };

  const handleEndMeeting = async () => {
    if (!confirm('End the meeting for everyone?')) return;
    try {
      const res = await axios.delete(`${API_URL}/api/rooms/${id}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      leaveRoom();
      navigate(`/reports/${res.data.sessionId}`);
    } catch {
      alert('Could not end meeting');
    }
  };

  const togglePanel = (panel) => setActivePanel((prev) => (prev === panel ? null : panel));

  return (
    <div className="room-page">
      {networkWarning && (
        <div className="network-banner">⚠ Weak connection detected — video quality may drop.</div>
      )}

      <div className="room-body">
        <VideoGrid
          localStream={localStream}
          remoteStreams={remoteStreams}
          participants={participants}
          myName={user?.name}
        />

        {activePanel === 'chat' && (
          <ChatPanel
            socketRef={socketRef}
            roomId={id}
            userId={user.id}
            userName={user.name}
            accessToken={accessToken}
            onClose={() => setActivePanel(null)}
          />
        )}
        {activePanel === 'whiteboard' && (
          <Whiteboard socketRef={socketRef} roomId={id} onClose={() => setActivePanel(null)} />
        )}
        {activePanel === 'people' && (
          <UserList participants={participants} myName={user?.name} onClose={() => setActivePanel(null)} />
        )}
      </div>

      <ControlsBar
        onToggleAudio={toggleAudio}
        onToggleVideo={toggleVideo}
        onShareScreen={shareScreen}
        onToggleChat={() => togglePanel('chat')}
        onToggleWhiteboard={() => togglePanel('whiteboard')}
        onToggleParticipants={() => togglePanel('people')}
        onLeave={handleLeave}
        isHost={isHost}
        onEndMeeting={handleEndMeeting}
      />
    </div>
  );
}
