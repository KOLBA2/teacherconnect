const express = require('express');
const upload = require('../middleware/upload');
const { authenticate } = require('../middleware/auth');
const {
  register,
  login,
  getCurrentUser,
  forgotPassword,
  resetPassword,
} = require('../controllers/authController');

const router = express.Router();

router.post('/register', upload.array('verificationPhotos', 5), register);
router.post('/login', login);
router.get('/me', authenticate, getCurrentUser);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

module.exports = router;
