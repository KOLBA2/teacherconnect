const express = require('express');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { uploadImage } = require('../middleware/uploadImage');
const {
  updateContact,
  updateProfile,
  updateAvatar,
  updateCover,
  getPublicProfile,
  getAnalytics,
  getMyAvailability,
  getTeacherAvailability,
  setAvailability,
} = require('../controllers/teacherController');

const router = express.Router();

router.put('/contact', authenticate, authorizeRoles('teacher'), updateContact);
router.put('/profile', authenticate, authorizeRoles('teacher'), updateProfile);
// Avatar + cover: any authenticated user (all tiers), native file upload.
router.put('/avatar', authenticate, uploadImage.single('image'), updateAvatar);
router.put('/cover', authenticate, uploadImage.single('image'), updateCover);
router.get('/analytics', authenticate, authorizeRoles('teacher'), getAnalytics);

// Weekly availability matrix (Item 4).
// Static path before the param route so it can't be swallowed by /:id.
router.get('/availability/me', authenticate, authorizeRoles('teacher'), getMyAvailability);
router.put('/availability', authenticate, authorizeRoles('teacher'), setAvailability);
router.get('/:id/availability', getTeacherAvailability);
// Public teacher profile.
router.get('/:id/profile', getPublicProfile);

module.exports = router;
