const express = require('express');
const router = express.Router();
const tourBookingController = require('../controllers/tourBookingController');
const authMiddleware = require('../middlewares/auth');

// Route công khai cho kiểm tra khả dụng
router.post('/check-availability', tourBookingController.checkTourAvailability);

// API chi tiết booking với thông tin đầy đủ (công khai)
router.get('/:id/details', tourBookingController.getTourBookingDetails);

// Các route yêu cầu đăng nhập
router.use(authMiddleware.protect);

// Lấy đặt tour của user hiện tại (phải đặt TRƯỚC route /:id)
router.get('/me', tourBookingController.getMyBookings);

// Tạo đặt tour mới
router.post('/', tourBookingController.createTourBooking);

// Hủy đặt tour
router.put('/:id/cancel', tourBookingController.cancelTourBooking);

// Lấy payment của booking - cần đăng nhập nhưng không giới hạn quyền
router.get('/:id/payment', tourBookingController.getBookingPayment);

// Route xem chi tiết đặt tour - phải đặt SAU /me
router.get('/:id', tourBookingController.getTourBooking);

// Cập nhật thông tin đặt tour (admin và user có thể cập nhật booking của mình)
router.put('/:id', tourBookingController.updateTourBooking);

// Các route chỉ dành cho admin
router.use(authMiddleware.restrictTo('admin'));

// Quản lý đặt tour (chỉ admin)
router.get('/admin/all-bookings', tourBookingController.getAllBookings);

module.exports = router; 