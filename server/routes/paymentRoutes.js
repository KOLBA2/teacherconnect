const express = require('express');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { checkout } = require('../controllers/paymentController');

const router = express.Router();

// Both paths hit the same mock gateway. `/checkout` is what the current UI
// calls; `/mock-checkout` is the explicit alias kept for clarity/spec parity.
router.post('/checkout', authenticate, authorizeRoles('teacher'), checkout);
router.post('/mock-checkout', authenticate, authorizeRoles('teacher'), checkout);

module.exports = router;
