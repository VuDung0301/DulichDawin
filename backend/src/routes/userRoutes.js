const express = require('express');
const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  getUserStats,
  getUserBookings,
  updateUserStatus
} = require('../controllers/userController');
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

// Route lấy thống kê users (phải đặt trước /:id để tránh conflict)
router.get('/stats', getUserStats);

// Routes quản lý người dùng
router.route('/')
  .get(getUsers)
  .post(createUser);

router.route('/:id')
  .get(getUser)
  .put(updateUser)
  .delete(deleteUser);

// Route lấy booking history của user
router.get('/:id/bookings', getUserBookings);

// Route cập nhật trạng thái user
router.put('/:id/status', updateUserStatus);

module.exports = router; 