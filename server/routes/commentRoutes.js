const express = require('express');
const { authenticate } = require('../middleware/auth');
const { updateComment, deleteComment } = require('../controllers/commentController');

const router = express.Router();

router.put('/:id', authenticate, updateComment);
router.delete('/:id', authenticate, deleteComment);

module.exports = router;
