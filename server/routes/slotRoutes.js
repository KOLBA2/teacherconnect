const express = require('express');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const {
  createSlot,
  getMySlots,
  deleteSlot,
  getTeacherSlots,
} = require('../controllers/slotController');

const router = express.Router();

router.post('/', authenticate, authorizeRoles('teacher'), createSlot);
router.get('/mine', authenticate, authorizeRoles('teacher'), getMySlots);
router.get('/teacher/:teacherId', getTeacherSlots);
router.delete('/:id', authenticate, authorizeRoles('teacher'), deleteSlot);

module.exports = router;
