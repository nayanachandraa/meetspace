const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  hostId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  roomCode: { type: String, required: true, unique: true },
  title: { type: String, default: 'Untitled Meeting' },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isActive: { type: Boolean, default: true },
  settings: {
    allowChat: { type: Boolean, default: true },
    allowScreenShare: { type: Boolean, default: true },
    maxParticipants: { type: Number, default: 8 }
  },
  scheduledFor: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('Room', roomSchema);