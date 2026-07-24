const express = require('express');
const { authenticate, optionalAuth, authorizeRoles } = require('../middleware/auth');
const { uploadImage } = require('../middleware/uploadImage');
const {
  createPost,
  getPosts,
  reportPost,
  ratePost,
  toggleSave,
  getSavedPosts,
  updatePromo,
  bumpPost,
  attachPostImage,
  logView,
  logContactClick,
} = require('../controllers/postController');
const { getComments, addComment, featureComment } = require('../controllers/commentController');

const router = express.Router();

router.get('/', optionalAuth, getPosts);
// Static path registered before the /:id/... params so it can never be
// swallowed by a parameterized match.
router.get('/saved', authenticate, getSavedPosts);
router.post('/', authenticate, authorizeRoles('teacher'), createPost);
router.post('/:id/report', authenticate, reportPost);
router.post('/:id/rate', authenticate, ratePost);
router.post('/:id/save', authenticate, toggleSave);
// Analytics logging — public (anonymous visitors count too).
router.post('/:id/view', logView);
router.post('/:id/contact-click', logContactClick);
// VIP promo manager (owner only, enforced in controller).
router.patch('/:id/promo', authenticate, authorizeRoles('teacher'), updatePromo);
// Bump-up (owner only; gated behind demo payments).
router.post('/:id/bump', authenticate, authorizeRoles('teacher'), bumpPost);
// Attach an image to a post (VIP/VIP+ owner; enforced in controller).
router.post('/:id/image', authenticate, authorizeRoles('teacher'), uploadImage.single('image'), attachPostImage);
router.get('/:id/comments', getComments);
router.post('/:id/comments', authenticate, addComment);
router.post('/:id/comments/:commentId/feature', authenticate, authorizeRoles('teacher'), featureComment);

module.exports = router;
