const express = require('express');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { getMyReferralStats } = require('../controllers/referralController');

const router = express.Router();

router.get('/me', authenticate, authorizeRoles('teacher'), getMyReferralStats);

module.exports = router;
