export default function UserList({ participants, myName, roomCode, onClose }) {
  const list = Object.values(participants);

  const copyCode = () => {
    if (roomCode) navigator.clipboard.writeText(roomCode);
  };

  return (
    <div className="userlist-panel">
      <div className="panel-header">
        <h4>Participants ({list.length + 1})</h4>
        <button onClick={onClose}>✕</button>
      </div>
      {roomCode && (
        <div className="room-code-box" style={{ margin: '10px 16px' }}>
          <span>Code: <strong>{roomCode}</strong></span>
          <button onClick={copyCode}>Copy</button>
        </div>
      )}
      <ul>
        <li>{myName} (You)</li>
        {list.map((p, i) => <li key={i}>{p.userName}</li>)}
      </ul>
    </div>
  );
}
