import { useEffect, useRef, useState, useCallback } from 'react';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' }
    // Add a TURN server for production (required for many corporate/mobile networks):
    // { urls: 'turn:your-turn-server.com:3478', username: 'user', credential: 'pass' }
  ]
};

// socketRef: ref returned by useSocket(); roomId, userId, userName identify this client
export function useWebRTC(socketRef, roomId, userId, userName) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({}); // { socketId: MediaStream }
  const [participants, setParticipants] = useState({}); // { socketId: { userId, userName } }
  const [connectionState, setConnectionState] = useState('idle');

  const peerConnections = useRef({}); // { socketId: RTCPeerConnection }
  const localStreamRef = useRef(null);

  const createPeerConnection = useCallback((remoteSocketId) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    pc.ontrack = (event) => {
      setRemoteStreams((prev) => ({ ...prev, [remoteSocketId]: event.streams[0] }));
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.emit('ice-candidate', { to: remoteSocketId, candidate: event.candidate });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        setConnectionState('degraded');
      }
    };

    peerConnections.current[remoteSocketId] = pc;
    return pc;
  }, [socketRef]);

  const removePeer = useCallback((socketId) => {
    const pc = peerConnections.current[socketId];
    if (pc) pc.close();
    delete peerConnections.current[socketId];
    setRemoteStreams((prev) => {
      const next = { ...prev };
      delete next[socketId];
      return next;
    });
    setParticipants((prev) => {
      const next = { ...prev };
      delete next[socketId];
      return next;
    });
  }, []);

  const init = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      setConnectionState('connected');

      const socket = socketRef.current;

      socket.emit('join-room', { roomId, userId, userName });

      socket.on('existing-users', async (users) => {
        for (const u of users) {
          setParticipants((prev) => ({ ...prev, [u.socketId]: { userId: u.userId, userName: u.userName } }));
          const pc = createPeerConnection(u.socketId);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('send-offer', { to: u.socketId, offer });
        }
      });

      socket.on('user-joined', ({ socketId, userId: uid, userName: uname }) => {
        setParticipants((prev) => ({ ...prev, [socketId]: { userId: uid, userName: uname } }));
        // Wait for their offer; we don't initiate here to avoid glare.
      });

      socket.on('receive-offer', async ({ from, offer, userName: uname }) => {
        setParticipants((prev) => ({ ...prev, [from]: { ...(prev[from] || {}), userName: uname } }));
        const pc = peerConnections.current[from] || createPeerConnection(from);
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('send-answer', { to: from, answer });
      });

      socket.on('receive-answer', async ({ from, answer }) => {
        const pc = peerConnections.current[from];
        if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
      });

      socket.on('ice-candidate', async ({ from, candidate }) => {
        const pc = peerConnections.current[from];
        if (pc && candidate) {
          try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch (e) { /* ignore */ }
        }
      });

      socket.on('user-left', ({ socketId }) => removePeer(socketId));
    } catch (err) {
      setConnectionState('error');
      console.error('Media/device error:', err);
    }
  }, [socketRef, roomId, userId, userName, createPeerConnection, removePeer]);

  const toggleAudio = useCallback(() => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = !t.enabled));
  }, []);

  const toggleVideo = useCallback(() => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getVideoTracks().forEach((t) => (t.enabled = !t.enabled));
  }, []);

  const shareScreen = useCallback(async () => {
    const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    const screenTrack = screenStream.getVideoTracks()[0];

    Object.values(peerConnections.current).forEach((pc) => {
      const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
      if (sender) sender.replaceTrack(screenTrack);
    });

    screenTrack.onended = () => {
      const camTrack = localStreamRef.current.getVideoTracks()[0];
      Object.values(peerConnections.current).forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
        if (sender) sender.replaceTrack(camTrack);
      });
    };

    return screenStream;
  }, []);

  const leaveRoom = useCallback(() => {
    Object.keys(peerConnections.current).forEach(removePeer);
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    if (socketRef.current) socketRef.current.emit('leave-room');
  }, [removePeer, socketRef]);

  useEffect(() => {
    return () => leaveRoom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    localStream,
    remoteStreams,
    participants,
    connectionState,
    init,
    toggleAudio,
    toggleVideo,
    shareScreen,
    leaveRoom
  };
}
