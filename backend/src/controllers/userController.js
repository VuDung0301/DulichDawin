const User = require('../models/User');
const TourBooking = require('../models/TourBooking');
const HotelBooking = require('../models/HotelBooking');
const FlightBooking = require('../models/FlightBooking');

/**
 * @desc    Lấy danh sách người dùng
 * @route   GET /api/users
 * @access  Private/Admin
 */
exports.getUsers = async (req, res, next) => {
  try {
    // Xử lý phân trang và tìm kiếm
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const keyword = req.query.keyword || '';

    // Tạo điều kiện tìm kiếm
    const searchCondition = keyword
      ? {
          $or: [
            { name: { $regex: keyword, $options: 'i' } },
            { email: { $regex: keyword, $options: 'i' } },
            { phone: { $regex: keyword, $options: 'i' } }
          ]
        }
      : {};

    // Đếm tổng số bản ghi
    const total = await User.countDocuments(searchCondition);

    // Lấy dữ liệu
    const users = await User.find(searchCondition)
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Lấy thông tin một người dùng
 * @route   GET /api/users/:id
 * @access  Private/Admin
 */
exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Tạo người dùng mới
 * @route   POST /api/users
 * @access  Private/Admin
 */
exports.createUser = async (req, res, next) => {
  try {
    // Kiểm tra xem email đã tồn tại chưa
    const existingUser = await User.findOne({ email: req.body.email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email đã được đăng ký'
      });
    }

    // Tạo người dùng mới
    const user = await User.create(req.body);

    res.status(201).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cập nhật thông tin người dùng
 * @route   PUT /api/users/:id
 * @access  Private/Admin
 */
exports.updateUser = async (req, res, next) => {
  try {
    // Lấy thông tin cần cập nhật
    const updateData = { ...req.body };

    // Nếu không có mật khẩu, loại bỏ trường password
    if (!updateData.password) {
      delete updateData.password;
    }

    // Cập nhật người dùng
    const user = await User.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Xóa người dùng
 * @route   DELETE /api/users/:id
 * @access  Private/Admin
 */
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    // Kiểm tra không cho phép xóa bản thân (nếu admin đang đăng nhập)
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Không thể xóa tài khoản của chính bạn'
      });
    }

    await user.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Xóa người dùng thành công'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Lấy thống kê người dùng
 * @route   GET /api/users/stats
 * @access  Private/Admin
 */
exports.getUserStats = async (req, res, next) => {
  try {
    // Thống kê tổng số người dùng theo vai trò
    const userStats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);

    // Thống kê người dùng mới trong 30 ngày qua
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const newUsers = await User.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });

    res.status(200).json({
      success: true,
      data: {
        usersByRole: userStats,
        newUsersLast30Days: newUsers
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Lấy lịch sử đặt chỗ của người dùng
 * @route   GET /api/users/:id/bookings
 * @access  Private/Admin
 */
exports.getUserBookings = async (req, res, next) => {
  try {
    const userId = req.params.id;
    
    console.log('Getting bookings for user:', userId);
    
    // Kiểm tra user có tồn tại không
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    // Lấy tất cả các loại booking của user
    const [tourBookings, hotelBookings, flightBookings] = await Promise.all([
      TourBooking.find({ user: userId })
        .populate('tour', 'name slug startLocation duration')
        .sort({ createdAt: -1 }),
      
      HotelBooking.find({ user: userId })
        .populate('hotel', 'name city')
        .sort({ createdAt: -1 }),
      
      FlightBooking.find({ user: userId })
        .populate('flight', 'flightNumber departureCity arrivalCity airline')
        .sort({ createdAt: -1 })
    ]);

    // Format dữ liệu để dễ hiển thị
    const allBookings = [
      ...tourBookings.map(booking => ({
        _id: booking._id,
        type: 'tour',
        serviceName: booking.tour?.name || 'N/A',
        serviceDetails: `${booking.tour?.duration || 'N/A'} ngày - ${booking.tour?.startLocation?.description || 'N/A'}`,
        totalPrice: booking.price,
        status: booking.status,
        createdAt: booking.createdAt,
        bookingReference: booking.bookingReference
      })),
      
      ...hotelBookings.map(booking => ({
        _id: booking._id,
        type: 'hotel',
        serviceName: booking.hotel?.name || 'N/A',
        serviceDetails: `${booking.hotel?.city || 'N/A'} - ${booking.nights || 'N/A'} đêm`,
        totalPrice: booking.totalPrice,
        status: booking.isPaid ? 'confirmed' : 'pending',
        createdAt: booking.createdAt,
        bookingReference: booking.bookingReference
      })),
      
      ...flightBookings.map(booking => ({
        _id: booking._id,
        type: 'flight',
        serviceName: booking.flight?.flightNumber || 'N/A',
        serviceDetails: `${booking.flight?.departureCity || 'N/A'} - ${booking.flight?.arrivalCity || 'N/A'}`,
        totalPrice: booking.totalPrice,
        status: booking.paymentStatus === 'completed' ? 'confirmed' : booking.status,
        createdAt: booking.createdAt,
        bookingReference: booking.bookingReference
      }))
    ];

    // Sắp xếp theo thời gian tạo (mới nhất trước)
    const sortedBookings = allBookings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    console.log(`Found ${sortedBookings.length} bookings for user ${userId}`);

    res.status(200).json({
      success: true,
      data: sortedBookings
    });
  } catch (error) {
    console.error('Error getting user bookings:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy lịch sử đặt chỗ',
      error: error.message
    });
  }
};

/**
 * @desc    Cập nhật trạng thái người dùng
 * @route   PUT /api/users/:id/status
 * @access  Private/Admin
 */
exports.updateUserStatus = async (req, res, next) => {
  try {
    const { active } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.params.id, 
      { active },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    res.status(200).json({
      success: true,
      data: user,
      message: `${active ? 'Mở khóa' : 'Khóa'} tài khoản thành công`
    });
  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật trạng thái người dùng',
      error: error.message
    });
  }
}; 