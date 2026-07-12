import { useEffect, useRef } from 'react';

function VideoTile({ stream, label, muted }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);

  return (
    <div className="video-tile">
      <video ref={ref} autoPlay playsInline muted={muted} />
      <span className="video-label">{label}</span>
    </div>
  );
}

export default function VideoGrid({ localStream, remoteStreams, participants, myName }) {
  const remoteEntries = Object.entries(remoteStreams);
  const tileCount = remoteEntries.length + 1;

  return (
    <div className={`video-grid tiles-${Math.min(tileCount, 9)}`}>
      {localStream && <VideoTile stream={localStream} label={`${myName} (You)`} muted={true} />}
      {remoteEntries.map(([socketId, stream]) => (
        <VideoTile
          key={socketId}
          stream={stream}
          label={participants[socketId]?.userName || 'Participant'}
          muted={false}
        />
      ))}
    </div>
  );
}
