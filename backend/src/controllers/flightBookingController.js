const asyncHandler = require('express-async-handler');
const FlightBooking = require('../models/FlightBooking');
const AppError = require('../utils/appError');
const Flight = require('../models/Flight');
const aviationApi = require('../services/aviationApiService');
const Payment = require('../models/Payment');

// @desc    Lấy tất cả đặt vé máy bay (chỉ cho admin)
// @route   GET /api/flight-bookings
// @access  Private/Admin
const getAllFlightBookings = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;

  let query = {};
  
  // Lọc theo trạng thái nếu được cung cấp
  if (req.query.status) {
    query.status = req.query.status;
  }

  // Lọc theo trạng thái thanh toán
  if (req.query.paymentStatus) {
    query.paymentStatus = req.query.paymentStatus;
  }

  // Lọc theo ngày đặt (từ - đến)
  if (req.query.fromDate && req.query.toDate) {
    query.createdAt = {
      $gte: new Date(req.query.fromDate),
      $lte: new Date(req.query.toDate)
    };
  }

  const total = await FlightBooking.countDocuments(query);
  const bookings = await FlightBooking.find(query)
    .populate('user', 'name email phone')
    .populate('flight', 'flightNumber airline departureAirport arrivalAirport departureTime arrivalTime')
    .sort({ createdAt: -1 })
    .skip(startIndex)
    .limit(limit);

  res.status(200).json({
    success: true,
    count: bookings.length,
    total,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
    data: bookings
  });
});

// @desc    Lấy danh sách đặt vé máy bay của người dùng đăng nhập
// @route   GET /api/flight-bookings/my-bookings
// @access  Private
const getMyFlightBookings = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;

  let query = { user: req.user._id };
  
  // Lọc theo trạng thái nếu được cung cấp
  if (req.query.status) {
    query.status = req.query.status;
  }

  const total = await FlightBooking.countDocuments(query);
  const bookings = await FlightBooking.find(query)
    .populate('flight', 'flightNumber airline departureAirport arrivalAirport departureTime arrivalTime')
    .sort({ createdAt: -1 })
    .skip(startIndex)
    .limit(limit);

  res.status(200).json({
    success: true,
    count: bookings.length,
    total,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
    data: bookings
  });
});

// @desc    Lấy chi tiết đặt vé máy bay theo ID
// @route   GET /api/flight-bookings/:id
// @access  Private
const getFlightBookingById = asyncHandler(async (req, res) => {
  const booking = await FlightBooking.findById(req.params.id)
    .populate('user', 'name email phone')
    .populate('flight', 'flightNumber airline departureAirport arrivalAirport departureTime arrivalTime price');

  if (!booking) {
    throw new AppError('Không tìm thấy thông tin đặt vé', 404);
  }

  // Kiểm tra xem người dùng có quyền xem đặt vé này không
  if (booking.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new AppError('Không có quyền truy cập thông tin này', 403);
  }

  res.status(200).json({
    success: true,
    data: booking
  });
});

// @desc    Tạo đặt vé máy bay mới
// @route   POST /api/flight-bookings
// @access  Private
const createFlightBooking = asyncHandler(async (req, res) => {
  try {
    // Log request để debug
    console.log('Flight booking request:', JSON.stringify(req.body, null, 2));
    
    // Thêm user ID từ người dùng đăng nhập
    req.body.user = req.user._id;
    
    // Kiểm tra và chuẩn hóa dữ liệu hành khách
    if (req.body.passengers && Array.isArray(req.body.passengers)) {
      req.body.passengers = req.body.passengers.map(passenger => {
        // Nếu có fullName nhưng không có firstName và lastName, tách ra
        if (passenger.fullName && (!passenger.firstName || !passenger.lastName)) {
          const nameParts = passenger.fullName.trim().split(' ').filter(part => part.length > 0);
          if (nameParts.length > 1) {
            passenger.lastName = nameParts.pop();
            passenger.firstName = nameParts.join(' ');
          } else {
            passenger.firstName = passenger.fullName.trim();
            passenger.lastName = '';
          }
        }
        
        // Đảm bảo firstName không rỗng
        if (!passenger.firstName || passenger.firstName.trim() === '') {
          passenger.firstName = passenger.fullName || 'Unnamed';
        }
        
        // Đảm bảo có title
        if (!passenger.title) {
          passenger.title = passenger.gender === 'Female' ? 'Ms' : 'Mr';
        }
        
        // Đảm bảo có nationality
        if (!passenger.nationality) {
          passenger.nationality = 'Vietnamese';
        }
        
        // Xử lý dob (date of birth)
        if (!passenger.dob || passenger.dob === '' || passenger.dob === null) {
          // Nếu không có dob hoặc dob rỗng, xóa field này để tránh lỗi validation
          delete passenger.dob;
        } else {
          // Đảm bảo dob là Date object hợp lệ
          const dobDate = new Date(passenger.dob);
          if (isNaN(dobDate.getTime())) {
            delete passenger.dob; // Xóa nếu không parse được
          } else {
            passenger.dob = dobDate;
          }
        }
        
        return passenger;
      });
    }
    
    // Xử lý thông tin chuyến bay trực tiếp từ frontend
    console.log('Processing flight booking without Flight model dependency...');
    
    // Đảm bảo có flightDate
    if (!req.body.flightDate && req.body.departureDate) {
      req.body.flightDate = req.body.departureDate;
    }
    if (!req.body.flightDate) {
      req.body.flightDate = new Date().toISOString().split('T')[0];
    }
    
    // Tạo flightDetails từ thông tin frontend gửi lên - ưu tiên dữ liệu từ frontend
    const flightDetails = {
      flightId: req.body.flightId,
      flightNumber: req.body.flightNumber || req.body.flightId,
      airline: req.body.airline || 'Unknown Airline',
      departureAirport: req.body.departureAirport || 'Unknown',
      arrivalAirport: req.body.arrivalAirport || 'Unknown',
      departureCity: req.body.departureCity || req.body.departureAirport || 'Unknown',
      arrivalCity: req.body.arrivalCity || req.body.arrivalAirport || 'Unknown',
      departureTime: req.body.departureTime ? new Date(req.body.departureTime) : new Date(),
      arrivalTime: req.body.arrivalTime ? new Date(req.body.arrivalTime) : new Date(),
      price: req.body.totalPrice || req.body.price || 0
    };
    
    // Gán flightDetails vào req.body
    req.body.flightDetails = flightDetails;
    
    // Kiểm tra thông tin cần thiết
    if (!flightDetails.flightId) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin chuyến bay cần thiết (flightId)',
      });
    }
    
    // Đảm bảo có contactInfo đúng cấu trúc
    if (!req.body.contactInfo) {
      req.body.contactInfo = {};
    }
    
    // Chuẩn hóa contactInfo
    if (req.body.contactInfo.fullName || req.body.contactInfo.name) {
      req.body.contactInfo.name = req.body.contactInfo.fullName || req.body.contactInfo.name;
      req.body.contactInfo.fullName = req.body.contactInfo.fullName || req.body.contactInfo.name;
    }
    
    // Đảm bảo có email và phone
    if (!req.body.contactInfo.email) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin email liên hệ',
      });
    }
    
    if (!req.body.contactInfo.phone) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin số điện thoại liên hệ',
      });
    }
    
    // Log dữ liệu cuối cùng trước khi tạo booking
    console.log('Final booking data:', {
      user: req.body.user,
      flightDetails: req.body.flightDetails,
      passengers: req.body.passengers?.length || 0,
      contactInfo: req.body.contactInfo,
      totalPrice: req.body.totalPrice,
      status: req.body.status || 'pending'
    });
    
    // Tạo đặt vé mới
    const booking = await FlightBooking.create(req.body);
    console.log('Booking created successfully:', booking._id);

    // Populate thông tin để trả về
    const populatedBooking = await FlightBooking.findById(booking._id)
      .populate('user', 'name email phone')
      .populate('flight', 'flightNumber airline departureAirport arrivalAirport departureTime arrivalTime price');

    console.log('Populated booking:', {
      id: populatedBooking._id,
      bookingReference: populatedBooking.bookingReference,
      flightDetails: populatedBooking.flightDetails,
      status: populatedBooking.status
    });

    res.status(201).json({
      success: true,
      data: populatedBooking,
      message: 'Đặt vé máy bay thành công'
    });
  } catch (error) {
    console.error('Lỗi khi tạo đặt vé:', error);
    
    // Xử lý lỗi validation
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        error: error.name,
        message: messages.join(', '),
        details: error.errors
      });
    }
    
    // Xử lý lỗi duplicate key
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Đã tồn tại đặt vé với thông tin này',
        error: 'Duplicate booking'
      });
    }
    
    // Các lỗi khác
    res.status(500).json({
      success: false,
      message: 'Không thể tạo đặt vé. Vui lòng thử lại sau',
      error: error.message
    });
  }
});

// Hàm mock đã được loại bỏ - sử dụng flightDetails trực tiếp thay vì tạo Flight model

// @desc    Cập nhật thông tin đặt vé máy bay
// @route   PUT /api/flight-bookings/:id
// @access  Private (Admin)
const updateFlightBooking = async (req, res, next) => {
  try {
    const booking = await FlightBooking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông tin đặt vé',
      });
    }

    // Kiểm tra quyền truy cập - admin có thể cập nhật tất cả, user chỉ có thể cập nhật booking của mình
    if (req.user.role !== 'admin' && booking.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền cập nhật đặt vé này',
      });
    }

    // Cập nhật thông tin - chỉ cập nhật status và metadata
    const updateData = {};
    
    // Xử lý cập nhật trạng thái
    if (req.body.status) {
      updateData.status = req.body.status;
      
      if (req.body.status === 'cancelled') {
        updateData.cancellationDate = new Date();
        updateData.cancellationReason = req.body.reason || 'Cập nhật bởi quản trị viên';
        updateData.paymentStatus = 'refunded';
      }
      
      if (req.body.status === 'confirmed') {
        updateData.confirmedDate = new Date();
        updateData.confirmedBy = req.user.id;
      }
      
      if (req.body.status === 'completed') {
        updateData.completedDate = new Date();
      }
    }

    // Các trường khác có thể cập nhật
    if (req.body.specialRequests !== undefined) {
      updateData.specialRequests = req.body.specialRequests;
    }

    if (req.body.notes !== undefined) {
      updateData.notes = req.body.notes;
    }

    if (req.body.paymentStatus !== undefined) {
      updateData.paymentStatus = req.body.paymentStatus;
      if (req.body.paymentStatus === 'paid') {
        updateData.paymentDate = new Date();
      }
    }

    // Cập nhật booking - sử dụng findByIdAndUpdate với $set
    const updatedBooking = await FlightBooking.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      {
        new: true,
        runValidators: false // Không chạy validators để tránh lỗi với required fields
      }
    ).populate('flight user');

    res.status(200).json({
      success: true,
      data: updatedBooking,
      message: 'Cập nhật thông tin đặt vé thành công'
    });
  } catch (error) {
    console.error('Update flight booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật đặt vé',
      error: error.message
    });
  }
};

// @desc    Cập nhật trạng thái đặt vé
// @route   PUT /api/flight-bookings/:id/status
// @access  Private/Admin
const updateFlightBookingStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  
  if (!status) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng cung cấp trạng thái đặt vé',
    });
  }
  
  const booking = await FlightBooking.findByIdAndUpdate(
    req.params.id,
    { status: status },
    { new: true }
  );
  
  if (!booking) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy đặt vé',
    });
  }
  
  res.status(200).json({
    success: true,
    data: booking,
  });
});

// @desc    Cập nhật trạng thái thanh toán
// @route   PUT /api/flight-bookings/:id/payment
// @access  Private/Admin
const updateFlightPaymentStatus = asyncHandler(async (req, res) => {
  const { paymentStatus, paymentMethod } = req.body;
  
  if (!paymentStatus) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng cung cấp trạng thái thanh toán',
    });
  }
  
  const updateData = {
    paymentStatus,
    paymentMethod: paymentMethod || undefined,
  };
  
  if (paymentStatus === 'paid') {
    updateData.paymentDate = Date.now();
  }
  
  const booking = await FlightBooking.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true }
  );
  
  if (!booking) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy đặt vé',
    });
  }
  
  res.status(200).json({
    success: true,
    data: booking,
  });
});

// @desc    Hủy đặt vé máy bay
// @route   PUT /api/flight-bookings/:id/cancel
// @access  Private
const cancelFlightBooking = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  
  const booking = await FlightBooking.findById(req.params.id);
  
  if (!booking) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy đặt vé',
    });
  }
  
  // Kiểm tra quyền truy cập
  if (booking.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Bạn không có quyền hủy đặt vé này',
    });
  }
  
  // Cập nhật booking
  booking.status = 'cancelled';
  booking.paymentStatus = 'refunded';
  booking.cancellationReason = reason || 'Không có lý do';
  
  await booking.save();
  
  res.status(200).json({
    success: true,
    data: booking,
  });
});

// @desc    Xóa đặt vé máy bay (chỉ admin)
// @route   DELETE /api/flight-bookings/:id
// @access  Private/Admin
const deleteFlightBooking = asyncHandler(async (req, res) => {
  const booking = await FlightBooking.findById(req.params.id);

  if (!booking) {
    throw new AppError('Không tìm thấy thông tin đặt vé', 404);
  }

  await booking.remove();

  res.status(200).json({
    success: true,
    message: 'Đã xóa thông tin đặt vé thành công'
  });
});

// @desc    Lấy chi tiết đặt vé kèm thông tin thanh toán
// @route   GET /api/flight-bookings/:id/details
// @access  Public
const getFlightBookingDetails = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Kiểm tra booking có tồn tại không
    const booking = await FlightBooking.findById(id)
      .populate({
        path: 'flight',
        select: 'airline flightNumber departureCity arrivalCity departureTime arrivalTime price',
      })
      .populate({
        path: 'user',
        select: 'name email phone',
      });
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông tin đặt vé',
      });
    }
    
    // Tìm thông tin thanh toán
    const payment = await Payment.findOne({ 
      bookingId: id, 
      bookingType: 'flight' 
    });
    
    // Đảm bảo thông tin liên hệ được hiển thị đúng
    if (!booking.contactInfo || !booking.contactInfo.fullName) {
      // Nếu không có thông tin liên hệ, sử dụng thông tin từ user
      booking.contactInfo = booking.contactInfo || {};
      
      if (booking.user && typeof booking.user !== 'string') {
        booking.contactInfo.fullName = booking.contactInfo.fullName || booking.user.name || '';
        booking.contactInfo.email = booking.contactInfo.email || booking.user.email || '';
        booking.contactInfo.phone = booking.contactInfo.phone || booking.user.phone || '';
      }
    }
    
    // Tạo mã tham chiếu booking nếu chưa có
    const bookingReference = booking.bookingReference || `FLT${booking._id.toString().slice(-8).toUpperCase()}`;
    
    // Cập nhật response với thông tin đầy đủ
    const responseData = booking.toObject();
    
    // Thêm thông tin payment nếu có
    if (payment) {
      responseData.payment = payment;
    }
    
    // Thêm bookingReference nếu chưa có
    if (!responseData.bookingReference) {
      responseData.bookingReference = bookingReference;
      
      // Cập nhật vào database nếu chưa có
      await FlightBooking.findByIdAndUpdate(id, { bookingReference });
    }
    
    res.status(200).json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    console.error('Error getting flight booking details:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thông tin chi tiết đặt vé',
      error: error.message,
    });
  }
};

module.exports = {
  getAllFlightBookings,
  getMyFlightBookings,
  getFlightBookingById,
  createFlightBooking,
  updateFlightBooking,
  updateFlightBookingStatus,
  updateFlightPaymentStatus,
  cancelFlightBooking,
  deleteFlightBooking,
  getFlightBookingDetails
}; 