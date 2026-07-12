const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');
const verifyToken = require('../middleware/verifyToken');

router.post('/', verifyToken, roomController.createRoom);
router.get('/:id', verifyToken, roomController.getRoom);
router.delete('/:id', verifyToken, roomController.endRoom);
router.get('/reports/:sessionId', verifyToken, roomController.getReport);
router.get('/reports/:sessionId/pdf', verifyToken, roomController.getReportPdf);

module.exports = router;
