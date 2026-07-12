const PDFDocument = require('pdfkit');
const Message = require('./models/Message');

/**
 * Streams a session summary PDF directly to an Express response.
 * Includes: meeting metadata, attendance, chat transcript, whiteboard note.
 */
async function generateSessionReport(session, room, res) {
  const messages = await Message.find({ roomId: room._id }).sort({ timestamp: 1 });

  const doc = new PDFDocument({ margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="meeting-report-${session._id}.pdf"`);
  doc.pipe(res);

  // Header
  doc.fontSize(20).text('Meeting Summary Report', { align: 'left' });
  doc.moveDown(0.3);
  doc.fontSize(11).fillColor('#555').text(room.title || 'Untitled Meeting');
  doc.fillColor('#000');
  doc.moveDown();

  // Metadata
  const durationMin = session.endTime
    ? Math.round((new Date(session.endTime) - new Date(session.startTime)) / 60000)
    : null;

  doc.fontSize(12);
  doc.text(`Room code: ${room.roomCode}`);
  doc.text(`Start time: ${new Date(session.startTime).toLocaleString()}`);
  doc.text(`End time: ${session.endTime ? new Date(session.endTime).toLocaleString() : 'In progress'}`);
  doc.text(`Duration: ${durationMin != null ? durationMin + ' minutes' : 'N/A'}`);
  doc.text(`Chat messages: ${session.chatCount}`);
  doc.text(`Files shared: ${session.filesShared}`);
  doc.moveDown();

  // Attendance
  doc.fontSize(14).text('Attendance', { underline: true });
  doc.moveDown(0.3);
  doc.fontSize(11);
  if (session.attendance && session.attendance.length > 0) {
    session.attendance.forEach((a) => {
      const joined = a.joinedAt ? new Date(a.joinedAt).toLocaleTimeString() : '—';
      const left = a.leftAt ? new Date(a.leftAt).toLocaleTimeString() : '—';
      doc.text(`• ${a.userName}  (joined ${joined}, left ${left})`);
    });
  } else {
    doc.text('Attendance details were not recorded for this session.');
  }
  doc.moveDown();

  // Chat transcript
  doc.fontSize(14).text('Chat Transcript', { underline: true });
  doc.moveDown(0.3);
  doc.fontSize(10);
  if (messages.length === 0) {
    doc.text('No chat messages were sent during this meeting.');
  } else {
    messages.forEach((m) => {
      const time = new Date(m.timestamp).toLocaleTimeString();
      const line = m.text
        ? `[${time}] ${m.userName}: ${m.text}`
        : `[${time}] ${m.userName} shared a file: ${m.fileUrl}`;
      doc.text(line);
    });
  }
  doc.moveDown();

  // Whiteboard note
  doc.fontSize(14).text('Whiteboard', { underline: true });
  doc.moveDown(0.3);
  doc.fontSize(11);
  doc.text(
    session.whiteboardSnapshot
      ? 'A whiteboard snapshot was captured for this session (see attached image export).'
      : 'No whiteboard snapshot was saved for this session.'
  );

  doc.end();
}

module.exports = { generateSessionReport };
