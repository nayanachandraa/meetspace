import { useRef, useEffect, useState } from 'react';

export default function Whiteboard({ socketRef, roomId, onClose }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const [tool, setTool] = useState('pen'); // pen | eraser
  const [color, setColor] = useState('#1a1a1a');

  const getCtx = () => canvasRef.current.getContext('2d');

  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const ctx = getCtx();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const socket = socketRef.current;
    socket.on('draw-start', ({ x, y, color: c, size }) => {
      ctx.beginPath();
      ctx.strokeStyle = c;
      ctx.lineWidth = size;
      ctx.moveTo(x, y);
    });
    socket.on('draw-move', ({ x, y }) => {
      ctx.lineTo(x, y);
      ctx.stroke();
    });
    socket.on('draw-end', () => ctx.closePath());
    socket.on('whiteboard-clear', () => ctx.clearRect(0, 0, canvas.width, canvas.height));

    return () => {
      socket.off('draw-start');
      socket.off('draw-move');
      socket.off('draw-end');
      socket.off('whiteboard-clear');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const strokeColor = tool === 'eraser' ? '#ffffff' : color;
  const strokeSize = tool === 'eraser' ? 20 : 3;

  const startDraw = (e) => {
    e.preventDefault();
    canvasRef.current.setPointerCapture?.(e.pointerId);
    drawing.current = true;
    const { x, y } = pos(e);
    const ctx = getCtx();
    ctx.beginPath();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeSize;
    ctx.moveTo(x, y);
    socketRef.current.emit('draw-start', { roomId, x, y, color: strokeColor, size: strokeSize });
  };

  const draw = (e) => {
    if (!drawing.current) return;
    e.preventDefault();
    const { x, y } = pos(e);
    const ctx = getCtx();
    ctx.lineTo(x, y);
    ctx.stroke();
    socketRef.current.emit('draw-move', { roomId, x, y });
  };

  const endDraw = (e) => {
    if (!drawing.current) return;
    if (e) canvasRef.current.releasePointerCapture?.(e.pointerId);
    drawing.current = false;
    getCtx().closePath();
    socketRef.current.emit('draw-end', { roomId });
  };

  const clearBoard = () => {
    const canvas = canvasRef.current;
    getCtx().clearRect(0, 0, canvas.width, canvas.height);
    socketRef.current.emit('whiteboard-clear', { roomId });
  };

  return (
    <div className="whiteboard-panel">
      <div className="panel-header">
        <h4>Whiteboard</h4>
        <div className="wb-tools">
          <button className={tool === 'pen' ? 'active' : ''} onClick={() => setTool('pen')}>✏️ Pen</button>
          <button className={tool === 'eraser' ? 'active' : ''} onClick={() => setTool('eraser')}>🧽 Eraser</button>
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
          <button onClick={clearBoard}>Clear</button>
        </div>
        <button onClick={onClose}>✕</button>
      </div>
      <canvas
        ref={canvasRef}
        onPointerDown={startDraw}
        onPointerMove={draw}
        onPointerUp={endDraw}
        onPointerCancel={endDraw}
        onPointerLeave={endDraw}
      />
    </div>
  );
}
