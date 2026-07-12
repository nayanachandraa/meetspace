const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});

const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } }); // 20MB cap

router.post('/', verifyToken, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  res.json({ fileUrl: `/uploads/${req.file.filename}`, originalName: req.file.originalname });
});

module.exports = router;
