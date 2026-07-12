// In-memory room presence tracker: { roomId: { socketId: { userId, userName } } }
const Session = require('../models/Session');
const Room = require('../models/Room');

const rooms = {};

async function recordJoin(roomId, userId, userName) {
  try {
    let session = await Session.findOne({ roomId, endTime: null }).sort({ createdAt: -1 });
    if (!session) {
      const room = await Room.findById(roomId);
      if (!room) return;
      session = await Session.create({ roomId, startTime: new Date(), attendance: [] });
    }
    session.attendance.push({ userId, userName, joinedAt: new Date(), leftAt: null });
    await session.save();
  } catch (err) {
    console.error('Attendance join tracking failed:', err.message);
  }
}

async function recordLeave(roomId, userId) {
  try {
    const session = await Session.findOne({ roomId, endTime: null }).sort({ createdAt: -1 });
    if (!session) return;
    const entry = [...session.attendance].reverse().find((a) => String(a.userId) === String(userId) && !a.leftAt);
    if (entry) {
      entry.leftAt = new Date();
      await session.save();
    }
  } catch (err) {
    console.error('Attendance leave tracking failed:', err.message);
  }
}

function signalingHandler(io, socket) {
  socket.on('join-room', ({ roomId, userId, userName }) => {
    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.userId = userId;
    socket.data.userName = userName;

    if (!rooms[roomId]) rooms[roomId] = {};

    // Tell the new user about everyone already in the room
    const existingUsers = Object.entries(rooms[roomId]).map(([socketId, info]) => ({
      socketId,
      ...info
    }));
    socket.emit('existing-users', existingUsers);

    rooms[roomId][socket.id] = { userId, userName };

    // Tell everyone else a new user joined
    socket.to(roomId).emit('user-joined', { socketId: socket.id, userId, userName });
    io.to(roomId).emit('user-online', { userId, userName });

    recordJoin(roomId, userId, userName);
  });

  // Relay SDP offer to a specific peer
  socket.on('send-offer', ({ to, offer }) => {
    io.to(to).emit('receive-offer', { from: socket.id, offer, userName: socket.data.userName });
  });

  // Relay SDP answer back to the offerer
  socket.on('send-answer', ({ to, answer }) => {
    io.to(to).emit('receive-answer', { from: socket.id, answer });
  });

  // Relay ICE candidates
  socket.on('ice-candidate', ({ to, candidate }) => {
    io.to(to).emit('ice-candidate', { from: socket.id, candidate });
  });

  socket.on('leave-room', () => cleanupSocket(io, socket));
  socket.on('disconnect', () => cleanupSocket(io, socket));
}

function cleanupSocket(io, socket) {
  const roomId = socket.data.roomId;
  if (!roomId || !rooms[roomId]) return;

  const userInfo = rooms[roomId][socket.id];
  delete rooms[roomId][socket.id];

  socket.to(roomId).emit('user-left', { socketId: socket.id });
  if (userInfo) {
    io.to(roomId).emit('user-offline', { userId: userInfo.userId });
    recordLeave(roomId, userInfo.userId);
  }

  if (Object.keys(rooms[roomId]).length === 0) delete rooms[roomId];
  socket.leave(roomId);
}

module.exports = signalingHandler;
