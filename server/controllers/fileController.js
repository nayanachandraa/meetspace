const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Folder = require('../models/Folder');
const FileItem = require('../models/FileItem');

function normalizeParent(parent) {
  if (!parent || parent === 'null' || parent === 'root') return null;
  return mongoose.Types.ObjectId.isValid(parent) ? parent : null;
}

// ---------- Folders ----------

exports.listFolders = async (req, res) => {
  try {
    const parent = normalizeParent(req.query.parent);
    const folders = await Folder.find({ ownerId: req.user.id, parentFolder: parent }).sort({ name: 1 });
    res.json({ folders });
  } catch (err) {
    res.status(500).json({ message: 'Failed to list folders', error: err.message });
  }
};

exports.createFolder = async (req, res) => {
  try {
    const { name, parentFolder } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ message: 'Folder name is required' });

    const folder = await Folder.create({
      name: name.trim(),
      ownerId: req.user.id,
      parentFolder: normalizeParent(parentFolder)
    });
    res.status(201).json({ folder });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create folder', error: err.message });
  }
};

exports.deleteFolder = async (req, res) => {
  try {
    const folder = await Folder.findOne({ _id: req.params.id, ownerId: req.user.id });
    if (!folder) return res.status(404).json({ message: 'Folder not found' });

    const subfolderCount = await Folder.countDocuments({ parentFolder: folder._id });
    if (subfolderCount > 0) {
      return res.status(400).json({ message: 'Delete or move subfolders first' });
    }

    // Cascade-delete files directly inside this folder (physical files + records)
    const files = await FileItem.find({ folder: folder._id, ownerId: req.user.id });
    for (const file of files) {
      const diskPath = path.join(__dirname, '..', file.fileUrl.replace(/^\//, ''));
      fs.unlink(diskPath, () => {}); // best-effort, ignore errors
    }
    await FileItem.deleteMany({ folder: folder._id, ownerId: req.user.id });
    await folder.deleteOne();

    res.json({ message: 'Folder deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete folder', error: err.message });
  }
};

// ---------- Files ----------

exports.listFiles = async (req, res) => {
  try {
    const folder = normalizeParent(req.query.folder);
    const files = await FileItem.find({ ownerId: req.user.id, folder }).sort({ createdAt: -1 });
    res.json({ files });
  } catch (err) {
    res.status(500).json({ message: 'Failed to list files', error: err.message });
  }
};

exports.listRecentFiles = async (req, res) => {
  try {
    const files = await FileItem.find({ ownerId: req.user.id }).sort({ createdAt: -1 }).limit(8);
    res.json({ files });
  } catch (err) {
    res.status(500).json({ message: 'Failed to list recent files', error: err.message });
  }
};

exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const folder = normalizeParent(req.body.folderId);
    const file = await FileItem.create({
      name: req.file.originalname,
      ownerId: req.user.id,
      folder,
      fileUrl: `/uploads/${req.file.filename}`,
      sizeBytes: req.file.size,
      mimeType: req.file.mimetype
    });

    res.status(201).json({ file });
  } catch (err) {
    res.status(500).json({ message: 'Failed to upload file', error: err.message });
  }
};

exports.deleteFile = async (req, res) => {
  try {
    const file = await FileItem.findOne({ _id: req.params.id, ownerId: req.user.id });
    if (!file) return res.status(404).json({ message: 'File not found' });

    const diskPath = path.join(__dirname, '..', file.fileUrl.replace(/^\//, ''));
    fs.unlink(diskPath, () => {}); // best-effort

    await file.deleteOne();
    res.json({ message: 'File deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete file', error: err.message });
  }
};