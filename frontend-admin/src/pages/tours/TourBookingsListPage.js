import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaEye, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import Layout from '../../components/layout/Layout';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import { tourBookingsAPI } from '../../services/api';

const TourBookingsListPage = () => {
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
    tourId: ''
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
      };

      // Thêm từ khóa tìm kiếm nếu có
      if (searchTerm && searchTerm.trim()) {
        params.search = searchTerm.trim();
      }

      // Thêm bộ lọc trạng thái nếu có
      if (filters.status && filters.status.trim()) {
        params.status = filters.status;
      }

      // Thêm bộ lọc ngày nếu có
      if (filters.fromDate) {
        params.startDate = filters.fromDate;
      }

      if (filters.toDate) {
        params.endDate = filters.toDate;
      }

      console.log('API Params:', params);
      const response = await tourBookingsAPI.getAll(params);
      
      if (response && response.success) {
        console.log('Dữ liệu tour bookings:', response.data);
        const bookingsData = Array.isArray(response.data) ? response.data : [];
        setBookings(bookingsData);
        
        if (response.pagination) {
          setPagination({
            page: response.pagination.page || 1,
            limit: response.pagination.limit || 10,
            total: response.pagination.total || 0,
            pages: response.pagination.pages || 1
          });
        } else {
          setPagination(prev => ({
            ...prev,
            total: bookingsData.length
          }));
        }
      } else {
        console.error('Lỗi API hoặc không có dữ liệu:', response?.message || 'Unknown error');
        setBookings([]);
      }
    } catch (error) {
      console.error('Error fetching tour bookings:', error);
      setBookings([]);
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
      'confirmed': 'chấp nhận',
      'cancelled': 'từ chối',
      'completed': 'hoàn thành'
    };
    
    const confirmMessage = `Bạn có chắc chắn muốn ${statusMessages[newStatus]} đơn đặt tour này không?`;
    
    if (window.confirm(confirmMessage)) {
      try {
        setActionLoading(true);
        const response = await tourBookingsAPI.update(id, { status: newStatus });
        
        if (response && response.success) {
          // Hiển thị thông báo thành công
          const successMessage = `${statusMessages[newStatus].charAt(0).toUpperCase() + statusMessages[newStatus].slice(1)} đơn đặt tour thành công!`;
          
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
        console.error('Update tour booking status error:', error);
        
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

  const columns = [
    {
      key: '_id',
      label: 'Mã đơn',
      sortable: true,
      render: (item) => item._id ? item._id.substring(0, 8) + '...' : 'N/A'
    },
    {
      key: 'user',
      label: 'Khách hàng',
      render: (item) => {
        if (!item.user) return 'N/A';
        const userName = item.user.name || `${item.user.firstName || ''} ${item.user.lastName || ''}`.trim();
        return userName || item.contactInfo?.fullName || 'N/A';
      }
    },
    {
      key: 'tour',
      label: 'Tour',
      render: (item) => {
        if (!item.tour) return 'N/A';
        return (
          <div className="max-w-xs truncate">
            <span className="font-medium text-indigo-600 hover:text-indigo-800 transition cursor-pointer" 
                 title={item.tour.name}>
              {item.tour.name}
            </span>
          </div>
        );
      }
    },
    {
      key: 'startDate',
      label: 'Ngày khởi hành',
      sortable: true,
      render: (item) => formatDate(item.startDate)
    },
    {
      key: 'numOfPeople',
      label: 'Số người',
      sortable: true,
      render: (item) => {
        const numOfPeople = item.numOfPeople || item.participants || 0;
        return numOfPeople;
      }
    },
    {
      key: 'price',
      label: 'Tổng tiền',
      type: 'price',
      sortable: true,
      render: (item) => formatPrice(item.price || item.totalPrice)
    },
    {
      key: 'status',
      label: 'Trạng thái',
      type: 'status',
      statusType: 'booking',
      render: (item) => <StatusBadge status={item.status} type="booking" />
    },
    {
      key: 'createdAt',
      label: 'Ngày đặt',
      sortable: true,
      render: (item) => formatDate(item.createdAt)
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
              to={`/tour-bookings/${item._id}`} 
              className="inline-flex items-center px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors duration-200"
            >
              <FaEye className="mr-1" /> Xem
            </Link>
          ),
        },
        {
          icon: <FaCheckCircle />,
          text: actionLoading ? 'Đang xử lý...' : 'Chấp nhận',
          label: 'Chấp nhận đơn đặt tour',
          onClick: (item) => handleUpdateStatus(item._id, 'confirmed'),
          className: 'text-green-600 hover:text-green-800 hover:bg-green-50',
          hidden: (item) => item.status === 'confirmed' || item.status === 'cancelled' || item.status === 'completed',
          disabled: () => actionLoading
        },
        {
          icon: <FaTimesCircle />,
          text: actionLoading ? 'Đang xử lý...' : 'Từ chối',
          label: 'Từ chối đơn đặt tour',
          onClick: (item) => handleUpdateStatus(item._id, 'cancelled'),
          className: 'text-red-600 hover:text-red-800 hover:bg-red-50',
          hidden: (item) => item.status === 'cancelled' || item.status === 'completed',
          disabled: () => actionLoading
        },
      ]
    }
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">Quản lý đặt tour</h1>
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
                    tourId: ''
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
            searchPlaceholder="Tìm kiếm theo tên khách hàng, mã đơn..."
          />
        </div>
      </div>
    </Layout>
  );
};

export default TourBookingsListPage; 