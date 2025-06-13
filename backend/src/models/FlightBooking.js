const mongoose = require('mongoose');

const FlightBookingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    flight: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Flight',
      required: false  // Cho phép null
    },
    // Thông tin chuyến bay trực tiếp - không cần reference
    flightDetails: {
      flightId: {
        type: String,
        required: true
      },
      flightNumber: {
        type: String,
        required: true
      },
      airline: {
        type: String,
        required: true
      },
      departureAirport: {
        type: String,
        required: true
      },
      arrivalAirport: {
        type: String,
        required: true
      },
      departureCity: {
        type: String,
        required: true
      },
      arrivalCity: {
        type: String,
        required: true
      },
      departureTime: {
        type: Date,
        required: true
      },
      arrivalTime: {
        type: Date,
        required: true
      },
      price: {
        type: Number,
        required: true
      }
    },
    flightDate: {
      type: String,
      required: true
    },
    bookingNumber: {
      type: String,
      unique: true,
      sparse: true
    },
    passengers: [
      {
        type: {
          type: String,
          enum: ['adult', 'child', 'infant'],
          default: 'adult'
        },
        title: {
          type: String,
          enum: ['Mr', 'Mrs', 'Ms', 'Miss', 'Mstr'],
          required: true
        },
        firstName: {
          type: String,
          required: true
        },
        lastName: {
          type: String,
          required: false,
          default: ''
        },
        fullName: {
          type: String,
          required: false
        },
        dob: {
          type: Date,
          required: false,
          default: null
        },
        gender: {
          type: String,
          enum: ['Male', 'Female', 'Other'],
          required: false
        },
        nationality: {
          type: String,
          required: true
        },
        identification: {
          type: String,
          required: false
        },
        passportNumber: {
          type: String,
          required: false
        },
        passportExpiry: {
          type: Date,
          required: false
        },
        seatClass: {
          type: String,
          enum: ['economy', 'premium_economy', 'business', 'first'],
          default: 'economy'
        }
      }
    ],
    contactInfo: {
      fullName: {
        type: String,
        required: false
      },
      name: {
        type: String,
        trim: true
      },
      email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
      },
      phone: {
        type: String,
        required: true,
        trim: true
      },
      identification: {
        type: String,
        required: false
      }
    },
    bookingReference: {
      type: String,
      unique: true
    },
    seatSelections: [
      {
        passenger: {
          type: Number, // Index trong mảng passengers
          required: true
        },
        seatNumber: {
          type: String,
          required: true
        }
      }
    ],
    baggageOptions: [
      {
        passenger: {
          type: Number, // Index trong mảng passengers
          required: true
        },
        checkedBaggage: {
          type: Number, // Trọng lượng (kg)
          default: 0
        },
        cabinBaggage: {
          type: Number, // Trọng lượng (kg)
          default: 0
        }
      }
    ],
    mealPreferences: [
      {
        passenger: {
          type: Number,
          required: true
        },
        mealType: {
          type: String,
          enum: ['regular', 'vegetarian', 'vegan', 'kosher', 'halal', 'diabetic', 'gluten-free', 'none'],
          default: 'regular'
        }
      }
    ],
    specialRequests: {
      type: String,
      trim: true
    },
    totalPrice: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'VND'
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'completed'],
      default: 'pending'
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'refunded', 'failed'],
      default: 'pending'
    },
    paymentMethod: {
      type: String,
      enum: ['credit_card', 'debit_card', 'bank_transfer', 'paypal', 'momo', 'zalopay', 'cash', 'sepay', 'vnpay', 'other'],
      required: false
    },
    paymentDate: {
      type: Date
    },
    bookingDate: {
      type: Date,
      default: Date.now
    },
    cancellationReason: {
      type: String
    },
    checkInStatus: {
      type: Boolean,
      default: false
    },
    boardingPass: {
      issuedAt: Date,
      document: String // URL to the document
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes để tối ưu hiệu suất
FlightBookingSchema.index({ user: 1, flight: 1 }, { unique: false });
FlightBookingSchema.index({ status: 1 });
FlightBookingSchema.index({ paymentStatus: 1 });
FlightBookingSchema.index({ bookingReference: 1 });

// Middleware để populate dữ liệu
FlightBookingSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'flight',
    select: 'flightNumber airline departureAirport arrivalAirport departureTime arrivalTime price'
  }).populate({
    path: 'user',
    select: 'name email phone'
  });
  next();
});

// Generate booking reference trước khi lưu (theo mẫu tour)
FlightBookingSchema.pre('save', async function(next) {
  // Tạo booking reference nếu chưa có (theo format TourBooking)
  if (!this.bookingReference) {
    // Lấy 8 ký tự cuối của ObjectId và thêm tiền tố FLT
    const objectIdStr = this._id.toString();
    const shortId = objectIdStr.substring(objectIdStr.length - 8);
    this.bookingReference = `FLT${shortId.toUpperCase()}`;
  }
  
  // Tạo booking number nếu chưa có (giữ nguyên logic cũ)
  if (!this.bookingNumber) {
    const prefix = 'FB';
    const timestamp = Date.now().toString().substring(7);
    const randomDigits = Math.floor(1000 + Math.random() * 9000).toString();
    this.bookingNumber = `${prefix}${timestamp}${randomDigits}`;
  }
  
  // Đảm bảo người dùng được lưu đúng cách
  if (this.user && typeof this.user !== 'string' && !mongoose.Types.ObjectId.isValid(this.user)) {
    if (this.user._id) {
      this.user = this.user._id;
    }
  }
  
  // Set ngày tạo booking nếu chưa có
  if (!this.bookingDate) {
    this.bookingDate = new Date();
  }
  
  // Set trạng thái mặc định nếu chưa có
  if (!this.status) {
    this.status = 'pending';
  }
  
  // Cập nhật thời gian khi lưu
  this.updatedAt = Date.now();
  
  next();
});

module.exports = mongoose.model('FlightBooking', FlightBookingSchema); 