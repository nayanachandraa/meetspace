import { useState } from 'react';

export default function ControlsBar({
  onToggleAudio, onToggleVideo, onShareScreen, onToggleChat,
  onToggleWhiteboard, onToggleParticipants, onLeave, isHost, onEndMeeting
}) {
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);

  return (
    <div className="controls-bar">
      <button onClick={() => { setMicOn(!micOn); onToggleAudio(); }} className={!micOn ? 'off' : ''}>
        {micOn ? '🎤' : '🔇'}
      </button>
      <button onClick={() => { setCamOn(!camOn); onToggleVideo(); }} className={!camOn ? 'off' : ''}>
        {camOn ? '📷' : '📷🚫'}
      </button>
      <button onClick={onShareScreen}>🖥️ Share</button>
      <button onClick={onToggleChat}>💬 Chat</button>
      <button onClick={onToggleWhiteboard}>🖊️ Whiteboard</button>
      <button onClick={onToggleParticipants}>👥 People</button>
      <button className="leave" onClick={onLeave}>Leave</button>
      {isHost && <button className="end-meeting" onClick={onEndMeeting}>End Meeting</button>}
    </div>
  );
}
