const express = require('express');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { bookSlot, getMyBookings, cancelBooking } = require('../controllers/slotController');

const router = express.Router();

router.post('/', authenticate, authorizeRoles('student'), bookSlot);
router.get('/mine', authenticate, getMyBookings);
router.delete('/:id', authenticate, cancelBooking);

module.exports = router;
