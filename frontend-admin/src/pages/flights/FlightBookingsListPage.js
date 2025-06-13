import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaEye, FaCheckCircle, FaTimesCircle, FaDownload, FaPrint } from 'react-icons/fa';
import Layout from '../../components/layout/Layout';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import { flightBookingsAPI } from '../../services/api';

const FlightBookingsListPage = () => {
  const [bookings, setBookings] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    fromDate: '',
    toDate: '',
    paymentStatus: ''
  });

  useEffect(() => {
    fetchBookings();
  }, [pagination.page, searchTerm, filters]);

  const fetchBookings = async () => {
    setIsLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        keyword: searchTerm,
        ...filters
      };
      
      // Lọc bỏ các params trống
      Object.keys(params).forEach(key => {
        if (!params[key]) delete params[key];
      });
      
      console.log('Gọi API danh sách đặt vé máy bay (admin):', params);
      const response = await flightBookingsAPI.getAll(params);
      
      if (response.status === 'success') {
        console.log('Dữ liệu đặt vé máy bay:', response.data);
        setBookings(response.data);
        setPagination({
          page: response.page || 1,
          limit: response.limit || 10,
          total: response.total || 0,
          pages: Math.ceil(response.total / (response.limit || 10)) || 1
        });
      }
    } catch (error) {
      console.error('Error fetching flight bookings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePageChange = (page) => {
    setPagination(prev => ({ ...prev, page }));
  };

  const handleSearch = (term) => {
    setSearchTerm(term);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleUpdateStatus = async (id, newStatus) => {
    const statusMessages = {
      'confirmed': 'xác nhận',
      'cancelled': 'hủy',
      'completed': 'hoàn thành'
    };
    
    const confirmMessage = `Bạn có chắc chắn muốn ${statusMessages[newStatus]} đơn đặt vé này không?`;
    
    if (window.confirm(confirmMessage)) {
      try {
        setActionLoading(true);
        // Sử dụng API update thống nhất
        const response = await flightBookingsAPI.update(id, { status: newStatus });
        
        if (response.success) {
          // Hiển thị thông báo thành công
          const successMessage = `${statusMessages[newStatus].charAt(0).toUpperCase() + statusMessages[newStatus].slice(1)} đơn đặt vé thành công!`;
          
          // Tạo toast notification
          const toast = document.createElement('div');
          toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300';
          toast.innerHTML = `
            <div class="flex items-center">
              <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
              </svg>
              ${successMessage}
            </div>
          `;
          document.body.appendChild(toast);
          
          // Xóa toast sau 3 giây
          setTimeout(() => {
            toast.remove();
          }, 3000);
          
          // Refresh data
          fetchBookings();
        } else {
          throw new Error(response.message || 'Không thể cập nhật trạng thái. Vui lòng thử lại sau.');
        }
      } catch (error) {
        console.error('Update flight booking status error:', error);
        
        // Hiển thị thông báo lỗi
        const toast = document.createElement('div');
        toast.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300';
        toast.innerHTML = `
          <div class="flex items-center">
            <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
            </svg>
            ${error.message || 'Có lỗi xảy ra. Vui lòng thử lại sau.'}
          </div>
        `;
        document.body.appendChild(toast);
        
        setTimeout(() => {
          toast.remove();
        }, 3000);
      } finally {
        setActionLoading(false);
      }
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  const formatPrice = (amount) => {
    if (!amount && amount !== 0) return 'N/A';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const handleExportExcel = () => {
    alert('Chức năng xuất Excel sẽ được phát triển sau.');
  };

  const getSeatClassName = (seatClass) => {
    switch (seatClass) {
      case 'economy': return 'Phổ thông';
      case 'business': return 'Thương gia';
      case 'firstClass': return 'Hạng nhất';
      default: return seatClass || 'N/A';
    }
  };

  const getStatusName = (status) => {
    if (!status) return 'pending';
    
    switch (status) {
      case 'Đang xử lý': return 'pending';
      case 'Đã xác nhận': return 'confirmed';
      case 'Đã hủy': return 'cancelled';
      case 'Hoàn thành': return 'completed';
      default: return status;
    }
  };

  const columns = [
    {
      key: 'bookingReference',
      label: 'Mã đơn',
      sortable: true,
      render: (item) => item.bookingNumber || `ID: ${item._id?.substring(0, 8) || 'N/A'}`
    },
    {
      key: 'user',
      label: 'Khách hàng',
      render: (item) => {
        if (!item.user) return item.contactInfo?.fullName || 'N/A';
        return item.user.name || item.contactInfo?.fullName || 'N/A';
      }
    },
    {
      key: 'flight',
      label: 'Chuyến bay',
      render: (item) => item.flight ? `${item.flight.flightNumber} (${item.flight.airline})` : 'N/A'
    },
    {
      key: 'route',
      label: 'Tuyến bay',
      render: (item) => item.flight ? `${item.flight.departureCity} - ${item.flight.arrivalCity}` : 'N/A'
    },
    {
      key: 'departureTime',
      label: 'Khởi hành',
      render: (item) => item.flight ? formatDate(item.flight.departureTime) : 'N/A'
    },
    {
      key: 'passengerCount',
      label: 'Số hành khách',
      render: (item) => Array.isArray(item.passengers) ? item.passengers.length : (item.numOfPassengers || 0)
    },
    {
      key: 'seatClass',
      label: 'Hạng ghế',
      render: (item) => getSeatClassName(item.seatClass)
    },
    {
      key: 'totalPrice',
      label: 'Tổng tiền',
      type: 'price',
      sortable: true,
      render: (item) => formatPrice(item.totalPrice || 0)
    },
    {
      key: 'paymentStatus',
      label: 'Thanh toán',
      render: (item) => {
        const paymentStatus = item.paymentStatus || 'pending';
        let statusText = 'Chưa thanh toán';
        let cssClass = 'bg-yellow-100 text-yellow-800';
        
        if (paymentStatus === 'paid') {
          statusText = 'Đã thanh toán';
          cssClass = 'bg-green-100 text-green-800';
        } else if (paymentStatus === 'failed') {
          statusText = 'Thanh toán thất bại';
          cssClass = 'bg-red-100 text-red-800';
        } else if (paymentStatus === 'refunded') {
          statusText = 'Đã hoàn tiền';
          cssClass = 'bg-blue-100 text-blue-800';
        }
        
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${cssClass}`}>
            {statusText}
          </span>
        );
      }
    },
    {
      key: 'status',
      label: 'Trạng thái',
      type: 'status',
      render: (item) => {
        const status = item.status || 'pending';
        return (
          <StatusBadge 
            status={getStatusName(status)} 
            type="booking" 
          />
        );
      }
    },
    {
      key: 'bookingDate',
      label: 'Ngày đặt',
      sortable: true,
      render: (item) => formatDate(item.bookingDate || item.createdAt)
    },
    {
      key: 'actions',
      label: 'Thao tác',
      type: 'actions',
      actions: [
        {
          icon: <FaEye />,
          text: 'Xem',
          label: 'Xem chi tiết',
          component: (item) => (
            <Link 
              to={`/flight-bookings/${item._id}`} 
              className="inline-flex items-center px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors duration-200"
            >
              <FaEye className="mr-1" /> Xem
            </Link>
          ),
        },
        {
          icon: <FaCheckCircle />,
          text: actionLoading ? 'Đang xử lý...' : 'Xác nhận',
          label: 'Xác nhận đơn đặt vé',
          onClick: (item) => handleUpdateStatus(item._id, 'confirmed'),
          className: 'text-green-600 hover:text-green-800 hover:bg-green-50',
          hidden: (item) => item.status !== 'pending' && item.status !== 'Đang xử lý',
          disabled: () => actionLoading
        },
        {
          icon: <FaTimesCircle />,
          text: actionLoading ? 'Đang xử lý...' : 'Hủy',
          label: 'Hủy đơn đặt vé',
          onClick: (item) => handleUpdateStatus(item._id, 'cancelled'),
          className: 'text-red-600 hover:text-red-800 hover:bg-red-50',
          hidden: (item) => {
            const status = item.status;
            return status === 'cancelled' || status === 'Đã hủy' || 
                  status === 'completed' || status === 'Hoàn thành';
          },
          disabled: () => actionLoading
        },
        {
          icon: <FaDownload />,
          text: 'PDF',
          label: 'Tải xuống PDF',
          onClick: (item) => {
            // TODO: Implement PDF download
            alert(`Tải xuống PDF cho booking ${item.bookingNumber || item._id.substring(0, 8)}...`);
          },
          className: 'text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50'
        }
      ]
    }
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">Quản lý đặt vé máy bay</h1>
          <div className="flex space-x-2">
            <button
              onClick={handleExportExcel}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition flex items-center"
            >
              <FaDownload className="mr-2" /> Xuất Excel
            </button>
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition flex items-center"
            >
              <FaPrint className="mr-2" /> In danh sách
            </button>
          </div>
        </div>
        
        {/* Bộ lọc */}
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Bộ lọc</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
              <select
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="">Tất cả</option>
                <option value="pending">Chờ xác nhận</option>
                <option value="confirmed">Đã xác nhận</option>
                <option value="cancelled">Đã hủy</option>
                <option value="completed">Hoàn thành</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Từ ngày</label>
              <input
                type="date"
                name="fromDate"
                value={filters.fromDate}
                onChange={handleFilterChange}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Đến ngày</label>
              <input
                type="date"
                name="toDate"
                value={filters.toDate}
                onChange={handleFilterChange}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            
            <div className="flex items-end">
              <button
                onClick={() => {
                  setFilters({
                    status: '',
                    fromDate: '',
                    toDate: '',
                    paymentStatus: ''
                  });
                  setPagination(prev => ({ ...prev, page: 1 }));
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Đặt lại
              </button>
            </div>
          </div>
        </div>
        
        {/* Data Table */}
        <div className="bg-white rounded-lg shadow-sm">
          <DataTable
            columns={columns}
            data={bookings}
            isLoading={isLoading}
            pagination={pagination}
            onPageChange={handlePageChange}
            onSearch={handleSearch}
            searchPlaceholder="Tìm kiếm theo mã đơn, tên khách hàng..."
          />
        </div>
      </div>
    </Layout>
  );
};

export default FlightBookingsListPage; 