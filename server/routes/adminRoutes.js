const express = require('express');
const { authenticate, isAdmin } = require('../middleware/auth');
const {
  getPendingTeachers,
  verifyTeacher,
  getReports,
  resolveReport,
  deletePost,
  blockUser,
  getAllTeachers,
  grantVip,
} = require('../controllers/adminController');

const router = express.Router();

router.use(authenticate, isAdmin);

router.get('/pending-teachers', getPendingTeachers);
router.put('/verify-teacher/:id', verifyTeacher);

router.get('/teachers', getAllTeachers);
router.put('/teachers/:id/grant-vip', grantVip);

router.get('/reports', getReports);
router.put('/reports/:id/resolve', resolveReport);
router.delete('/posts/:id', deletePost);
router.put('/users/:id/block', blockUser);

module.exports = router;
