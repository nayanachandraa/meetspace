const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const fileController = require('../controllers/fileController');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } }); // 20MB cap

// Folders
router.get('/folders', verifyToken, fileController.listFolders);
router.post('/folders', verifyToken, fileController.createFolder);
router.delete('/folders/:id', verifyToken, fileController.deleteFolder);

// Files
router.get('/recent', verifyToken, fileController.listRecentFiles);
router.get('/', verifyToken, fileController.listFiles);
router.post('/upload', verifyToken, upload.single('file'), fileController.uploadFile);
router.delete('/:id', verifyToken, fileController.deleteFile);

module.exports = router;