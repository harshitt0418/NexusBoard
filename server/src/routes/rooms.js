const express = require('express');
const router = express.Router();
const { createRoom, getRoom, joinRoom, endRoom } = require('../controllers/roomController');
const { optionalAuth } = require('../middleware/auth');

router.post('/', optionalAuth, createRoom);
router.get('/:roomId', getRoom);
router.post('/:roomId/join', optionalAuth, joinRoom);
router.post('/:roomId/end', optionalAuth, endRoom);

module.exports = router;
