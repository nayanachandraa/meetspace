const mongoose = require('mongoose');

const fileItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  folder: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder', default: null }, // null = root
  fileUrl: { type: String, required: true },
  sizeBytes: { type: Number, default: 0 },
  mimeType: { type: String, default: 'application/octet-stream' }
}, { timestamps: true });

module.exports = mongoose.model('FileItem', fileItemSchema);