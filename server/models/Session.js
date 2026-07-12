const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, default: null },
  attendance: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    userName: String,
    joinedAt: Date,
    leftAt: Date
  }],
  chatCount: { type: Number, default: 0 },
  filesShared: { type: Number, default: 0 },
  whiteboardSnapshot: { type: String, default: '' } // base64 PNG or JSON
}, { timestamps: true });

module.exports = mongoose.model('Session', sessionSchema);
