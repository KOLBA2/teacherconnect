const express = require('express');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const {
  createBookingRequest,
  getTeacherBookingRequests,
  confirmBookingRequest,
  deleteBookingRequest,
} = require('../controllers/bookingRequestController');

const router = express.Router();

// Public: students (logged in or not) submit a booking request.
router.post('/', createBookingRequest);
// Teacher-only management.
router.get('/teacher', authenticate, authorizeRoles('teacher'), getTeacherBookingRequests);
router.put('/:id/confirm', authenticate, authorizeRoles('teacher'), confirmBookingRequest);
router.delete('/:id', authenticate, authorizeRoles('teacher'), deleteBookingRequest);

module.exports = router;
