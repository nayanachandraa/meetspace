const Message = require('../models/Message');

function chatSocketHandler(io, socket) {
  socket.on('chat-message', async ({ roomId, userId, userName, text, fileUrl }) => {
    try {
      const message = await Message.create({ roomId, userId, userName, text, fileUrl: fileUrl || '' });
      io.to(roomId).emit('chat-message', {
        _id: message._id,
        userId,
        userName,
        text,
        fileUrl: message.fileUrl,
        timestamp: message.timestamp
      });
    } catch (err) {
      socket.emit('chat-error', { message: 'Failed to send message' });
    }
  });

  socket.on('typing-start', ({ roomId, userName }) => {
    socket.to(roomId).emit('typing-start', { userName });
  });

  socket.on('typing-stop', ({ roomId, userName }) => {
    socket.to(roomId).emit('typing-stop', { userName });
  });
}

module.exports = chatSocketHandler;
