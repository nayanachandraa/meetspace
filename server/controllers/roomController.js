const crypto = require('crypto');
const mongoose = require('mongoose');
const Room = require('../models/Room');
const Session = require('../models/Session');
const Message = require('../models/Message');
const { generateSessionReport } = require('../report-generator');

function generateRoomCode() {
  return crypto.randomBytes(4).toString('hex'); // e.g. "a1b2c3d4"
}

exports.createRoom = async (req, res) => {
  try {
    const { title, scheduledFor } = req.body;
    const roomCode = generateRoomCode();

    const room = await Room.create({
      hostId: req.user.id,
      roomCode,
      title: title || 'Untitled Meeting',
      participants: [req.user.id],
      scheduledFor: scheduledFor || null
    });

    res.status(201).json({ roomId: room._id, roomCode: room.roomCode, isHost: true, room });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create room', error: err.message });
  }
};

exports.getRoom = async (req, res) => {
  try {
    const param = req.params.id;
    const query = mongoose.Types.ObjectId.isValid(param)
      ? { $or: [{ _id: param }, { roomCode: param }] }
      : { roomCode: param };

    const room = await Room.findOne(query).populate('hostId', 'name email avatar');

    if (!room) return res.status(404).json({ message: 'Room not found' });
    if (!room.isActive) return res.status(410).json({ message: 'This meeting has ended' });

    res.json({
      room,
      isHost: String(room.hostId._id) === String(req.user.id)
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch room', error: err.message });
  }
};

exports.endRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: 'Room not found' });
    if (String(room.hostId) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Only the host can end the meeting' });
    }

    room.isActive = false;
    await room.save();

    // Aggregate a session summary
    const chatCount = await Message.countDocuments({ roomId: room._id });
    const filesShared = await Message.countDocuments({ roomId: room._id, fileUrl: { $ne: '' } });

    let session = await Session.findOne({ roomId: room._id, endTime: null }).sort({ createdAt: -1 });
    if (!session) {
      session = await Session.findOne({ roomId: room._id }).sort({ createdAt: -1 });
    }

    if (session) {
      session.endTime = new Date();
      session.chatCount = chatCount;
      session.filesShared = filesShared;
      // Close out anyone whose leftAt wasn't recorded (e.g. host ending abruptly)
      session.attendance.forEach((a) => { if (!a.leftAt) a.leftAt = new Date(); });
      await session.save();
    } else {
      session = await Session.create({
        roomId: room._id,
        startTime: room.createdAt,
        endTime: new Date(),
        chatCount,
        filesShared
      });
    }

    res.json({ message: 'Meeting ended', sessionId: session._id });
  } catch (err) {
    res.status(500).json({ message: 'Failed to end room', error: err.message });
  }
};

exports.getReport = async (req, res) => {
  try {
    const session = await Session.findById(req.params.sessionId).populate('roomId');
    if (!session) return res.status(404).json({ message: 'Report not found' });
    res.json(session);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch report', error: err.message });
  }
};

exports.getReportPdf = async (req, res) => {
  try {
    const session = await Session.findById(req.params.sessionId).populate('roomId');
    if (!session) return res.status(404).json({ message: 'Report not found' });
    await generateSessionReport(session, session.roomId, res);
  } catch (err) {
    res.status(500).json({ message: 'Failed to generate PDF report', error: err.message });
  }
};

// Rooms this user scheduled for the future that haven't started/ended yet
exports.getUpcomingMeetings = async (req, res) => {
  try {
    const rooms = await Room.find({
      hostId: req.user.id,
      isActive: true,
      scheduledFor: { $gte: new Date() }
    }).sort({ scheduledFor: 1 }).limit(10);

    res.json({ meetings: rooms });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch upcoming meetings', error: err.message });
  }
};

// A schedule-only room: created for later, not meant to be entered immediately
exports.scheduleMeeting = async (req, res) => {
  try {
    const { title, scheduledFor } = req.body;
    if (!scheduledFor) return res.status(400).json({ message: 'scheduledFor is required' });

    const roomCode = generateRoomCode();
    const room = await Room.create({
      hostId: req.user.id,
      roomCode,
      title: title || 'Untitled Meeting',
      participants: [req.user.id],
      scheduledFor: new Date(scheduledFor)
    });

    res.status(201).json({ meeting: room });
  } catch (err) {
    res.status(500).json({ message: 'Failed to schedule meeting', error: err.message });
  }
};

// Cancel a scheduled meeting that hasn't started yet (host only)
exports.cancelMeeting = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: 'Meeting not found' });
    if (String(room.hostId) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Only the host can cancel this meeting' });
    }
    room.isActive = false;
    await room.save();
    res.json({ message: 'Meeting cancelled' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to cancel meeting', error: err.message });
  }
};

// Real activity feed: this user's ended meetings (from Session/attendance history)
exports.getActivity = async (req, res) => {
  try {
    const sessions = await Session.find({
      'attendance.userId': req.user.id,
      endTime: { $ne: null }
    })
      .sort({ endTime: -1 })
      .limit(10)
      .populate('roomId', 'title roomCode');

    const activity = sessions
      .filter((s) => s.roomId) // room may have been fully removed in edge cases
      .map((s) => {
        const durationMin = Math.round((new Date(s.endTime) - new Date(s.startTime)) / 60000);
        return {
          sessionId: s._id,
          roomTitle: s.roomId.title,
          endTime: s.endTime,
          durationMin,
          chatCount: s.chatCount,
          filesShared: s.filesShared,
          attendeeCount: s.attendance.length
        };
      });

    res.json({ activity });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch activity', error: err.message });
  }
};