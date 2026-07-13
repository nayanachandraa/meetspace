require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const mongoose = require('mongoose');
const { Server } = require('socket.io');

const authRoutes = require('./routes/auth');
const roomRoutes = require('./routes/rooms');
const uploadRoutes = require('./routes/upload');
const filesRoutes = require('./routes/files');

const signalingHandler = require('./sockets/signaling');
const chatSocketHandler = require('./sockets/chatSocket');
const whiteboardSocketHandler = require('./sockets/whiteboardSocket');

const app = express();
const server = http.createServer(app);

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json());
app.use('/uploads', express.static('uploads'));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/files', filesRoutes);

const io = new Server(server, {
  cors: { origin: CLIENT_URL, methods: ['GET', 'POST'] }
});

io.on('connection', (socket) => {
  signalingHandler(io, socket);
  chatSocketHandler(io, socket);
  whiteboardSocketHandler(io, socket);
});

const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });