function whiteboardSocketHandler(io, socket) {
  socket.on('draw-start', ({ roomId, ...data }) => {
    socket.to(roomId).emit('draw-start', data);
  });

  socket.on('draw-move', ({ roomId, ...data }) => {
    socket.to(roomId).emit('draw-move', data);
  });

  socket.on('draw-end', ({ roomId, ...data }) => {
    socket.to(roomId).emit('draw-end', data);
  });

  socket.on('whiteboard-clear', ({ roomId }) => {
    socket.to(roomId).emit('whiteboard-clear');
  });
}

module.exports = whiteboardSocketHandler;
