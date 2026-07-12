import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

export default function ChatPanel({ socketRef, roomId, userId, userName, accessToken, onClose }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [typingUser, setTypingUser] = useState(null);
  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    socket.on('chat-message', (msg) => setMessages((prev) => [...prev, msg]));
    socket.on('typing-start', ({ userName: u }) => setTypingUser(u));
    socket.on('typing-stop', () => setTypingUser(null));

    return () => {
      socket.off('chat-message');
      socket.off('typing-start');
      socket.off('typing-stop');
    };
  }, [socketRef]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = (fileUrl = '') => {
    if (!text.trim() && !fileUrl) return;
    socketRef.current.emit('chat-message', { roomId, userId, userName, text, fileUrl });
    setText('');
  };

  const handleTyping = (val) => {
    setText(val);
    socketRef.current.emit('typing-start', { roomId, userName });
    clearTimeout(handleTyping._t);
    handleTyping._t = setTimeout(() => {
      socketRef.current.emit('typing-stop', { roomId, userName });
    }, 1200);
  };

  const uploadFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await axios.post(`${API_URL}/api/upload`, formData, {
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'multipart/form-data' }
      });
      sendMessage(`${API_URL}${res.data.fileUrl}`);
    } catch {
      alert('File upload failed');
    }
    e.target.value = '';
  };

  return (
    <div className="chat-panel">
      <div className="panel-header">
        <h4>Chat</h4>
        <button onClick={onClose}>✕</button>
      </div>

      <div className="chat-messages">
        {messages.map((m) => (
          <div key={m._id || Math.random()} className={`chat-msg ${m.userId === userId ? 'own' : ''}`}>
            <span className="chat-author">{m.userName}</span>
            {m.text && <p>{m.text}</p>}
            {m.fileUrl && (
              <a href={m.fileUrl} target="_blank" rel="noreferrer">📎 Shared file</a>
            )}
          </div>
        ))}
        {typingUser && <p className="typing-indicator">{typingUser} is typing…</p>}
        <div ref={bottomRef} />
      </div>

      <div className="chat-input-row">
        <input type="file" ref={fileInputRef} onChange={uploadFile} style={{ display: 'none' }} />
        <button onClick={() => fileInputRef.current.click()}>📎</button>
        <input
          value={text}
          onChange={(e) => handleTyping(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Type a message…"
        />
        <button className="primary" onClick={() => sendMessage()}>Send</button>
      </div>
    </div>
  );
}
