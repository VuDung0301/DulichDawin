import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FaArrowLeft, FaCheckCircle, FaTimesCircle, FaMoneyBillWave, FaCalendarAlt, FaUsers, FaMapMarkedAlt, FaRoute, FaExclamationTriangle } from 'react-icons/fa';
import Layout from '../../components/layout/Layout';
import StatusBadge from '../../components/common/StatusBadge';
import { tourBookingsAPI } from '../../services/api';

const TourBookingDetailPage = () => {
  const { id } = useParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const fetchBookingData = async () => {
      try {
        setLoading(true);
        const response = await tourBookingsAPI.getById(id);
        
        if (response.success) {
          setBooking(response.data);
        } else {
          setError('Không thể tải thông tin đặt tour');
        }
      } catch (err) {
        console.error('Lỗi khi tải dữ liệu đặt tour:', err);
        setError('Đã xảy ra lỗi khi tải dữ liệu đặt tour');
      } finally {
        setLoading(false);
      }
    };

    fetchBookingData();
  }, [id]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return 'N/A';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const handleUpdateStatus = async (newStatus) => {
    const statusMessages = {
      'confirmed': 'xác nhận',
      'cancelled': 'hủy',
      'completed': 'hoàn thành'
    };
    
    const confirmMessage = `Bạn có chắc chắn muốn ${statusMessages[newStatus]} đơn đặt tour này không?`;
    
    if (window.confirm(confirmMessage)) {
      try {
        setActionLoading(true);
        const response = await tourBookingsAPI.update(id, { status: newStatus });
        
        if (response.success) {
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
          
          setBooking(prev => ({ 
            ...prev, 
            status: newStatus,
            updatedAt: new Date().toISOString()
          }));
        } else {
          throw new Error(response.message || 'Không thể cập nhật trạng thái. Vui lòng thử lại sau.');
        }
      } catch (error) {
        console.error('Update booking status error:', error);
        
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

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </Layout>
    );
  }

  if (error || !booking) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-screen">
          <h2 className="text-2xl font-bold mb-4">Đã xảy ra lỗi</h2>
          <p className="text-red-500 mb-4">{error || 'Không thể tải thông tin đặt tour'}</p>
          <Link to="/tour-bookings" className="flex items-center text-indigo-600 hover:text-indigo-800">
            <FaArrowLeft className="mr-2" /> Quay lại danh sách đặt tour
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <Link to="/tour-bookings" className="text-indigo-600 hover:text-indigo-800 flex items-center">
            <FaArrowLeft className="mr-2" />
            Quay lại danh sách đặt tour
          </Link>
        </div>

        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Chi tiết đặt tour</h1>
            <p className="text-gray-600">Mã đơn: {booking?._id}</p>
          </div>
          <StatusBadge status={booking?.status} type="booking" size="lg" />
        </div>

        {/* Thông tin tour */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center mb-4">
            <FaRoute className="text-indigo-600 mr-2 text-xl" />
            <h2 className="text-xl font-bold">Thông tin tour</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Tour:</h3>
              {booking?.tour ? (
                <Link 
                  to={`/tours/${booking.tour._id}`} 
                  className="text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  {booking.tour.name || booking.tour.title}
                </Link>
              ) : (
                <p>Không có thông tin</p>
              )}
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Địa điểm:</h3>
              <p>{booking?.tour?.location || booking?.tour?.destination || 'Không có thông tin'}</p>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Ngày bắt đầu:</h3>
              <p>{formatDate(booking?.departureDate || booking?.startDate)}</p>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Thời gian:</h3>
              <p>{booking?.tour?.duration || 'Không có thông tin'}</p>
            </div>
          </div>
        </div>

        {/* Thông tin đặt tour */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <FaCalendarAlt className="text-indigo-600 mr-2" />
              <h2 className="text-lg font-bold">Lịch trình</h2>
            </div>
            <div className="space-y-2">
              <div>
                <span className="text-gray-600">Ngày khởi hành:</span>
                <p className="font-semibold">{formatDate(booking?.departureDate || booking?.startDate)}</p>
              </div>
              <div>
                <span className="text-gray-600">Ngày kết thúc:</span>
                <p className="font-semibold">{formatDate(booking?.returnDate || booking?.endDate)}</p>
              </div>
              <div>
                <span className="text-gray-600">Số ngày:</span>
                <p className="font-semibold">{booking?.tour?.duration || 'N/A'}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <FaUsers className="text-indigo-600 mr-2" />
              <h2 className="text-lg font-bold">Khách</h2>
            </div>
            <div className="space-y-2">
              {booking?.guests && typeof booking.guests === 'object' ? (
                <>
                  <div>
                    <span className="text-gray-600">Người lớn:</span>
                    <p className="font-semibold">{booking.guests.adults || 0} người</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Trẻ em:</span>
                    <p className="font-semibold">{booking.guests.children || 0} người</p>
                  </div>
                </>
              ) : (
                <div>
                  <span className="text-gray-600">Tổng số khách:</span>
                  <p className="font-semibold">{booking?.numberOfPeople || booking?.passengers || booking?.guests || 0} người</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <FaMoneyBillWave className="text-indigo-600 mr-2" />
              <h2 className="text-lg font-bold">Thanh toán</h2>
            </div>
            <div className="space-y-2">
              <div>
                <span className="text-gray-600">Tổng tiền:</span>
                <p className="font-semibold text-xl">{formatCurrency(booking?.totalPrice)}</p>
              </div>
              <div>
                <span className="text-gray-600">Phương thức:</span>
                <p className="font-semibold">{booking?.paymentMethod || 'Không có thông tin'}</p>
              </div>
              <div>
                <span className="text-gray-600">Trạng thái thanh toán:</span>
                <p className={`font-semibold ${booking?.isPaid ? 'text-green-600' : 'text-red-600'}`}>
                  {booking?.isPaid ? 'Đã thanh toán' : 'Chưa thanh toán'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Thông tin khách hàng */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center mb-4">
            <FaUsers className="text-indigo-600 mr-2 text-xl" />
            <h2 className="text-xl font-bold">Thông tin khách hàng</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Họ tên:</h3>
              <p>{booking?.user?.name || booking?.contactInfo?.fullName || 'Không có thông tin'}</p>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Email:</h3>
              <p>{booking?.contactInfo?.email || booking?.user?.email || 'Không có thông tin'}</p>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Số điện thoại:</h3>
              <p>{booking?.contactInfo?.phone || booking?.user?.phone || 'Không có thông tin'}</p>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Yêu cầu đặc biệt:</h3>
              <p>{booking?.specialRequests || 'Không có'}</p>
            </div>
          </div>
        </div>

        {/* Thông tin hành khách */}
        {booking?.passengerDetails && booking.passengerDetails.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center mb-4">
              <FaUsers className="text-indigo-600 mr-2 text-xl" />
              <h2 className="text-xl font-bold">Danh sách hành khách</h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      STT
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Họ tên
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Loại khách
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ngày sinh
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {booking.passengerDetails.map((passenger, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {passenger.name || passenger.fullName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {passenger.type || (passenger.isChild ? 'Trẻ em' : 'Người lớn')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {passenger.birthDate ? formatDate(passenger.birthDate) : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Lịch sử đơn hàng */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center mb-4">
            <FaCalendarAlt className="text-indigo-600 mr-2 text-xl" />
            <h2 className="text-xl font-bold">Lịch sử đơn hàng</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <div>
                <p className="font-semibold">Ngày đặt:</p>
                <p>{formatDate(booking?.createdAt)}</p>
              </div>
              <StatusBadge status="pending" type="booking" />
            </div>
            
            {booking?.updatedAt && booking.updatedAt !== booking.createdAt && (
              <div className="flex justify-between items-center border-b pb-2">
                <div>
                  <p className="font-semibold">Ngày cập nhật:</p>
                  <p>{formatDate(booking.updatedAt)}</p>
                </div>
                <StatusBadge status={booking.status} type="booking" />
              </div>
            )}
          </div>
        </div>

        {/* Các nút hành động */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">Hành động</h2>
          <div className="flex flex-wrap gap-4 justify-end">
            {booking?.status === 'pending' && (
              <>
                <button
                  onClick={() => handleUpdateStatus('confirmed')}
                  disabled={actionLoading}
                  className={`px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center transition-colors shadow-md ${
                    actionLoading ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg'
                  }`}
                >
                  <FaCheckCircle className="mr-2" />
                  {actionLoading ? 'Đang xử lý...' : 'Xác nhận đơn'}
                </button>
                
                <button
                  onClick={() => handleUpdateStatus('cancelled')}
                  disabled={actionLoading}
                  className={`px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center transition-colors shadow-md ${
                    actionLoading ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg'
                  }`}
                >
                  <FaTimesCircle className="mr-2" />
                  {actionLoading ? 'Đang xử lý...' : 'Hủy đơn'}
                </button>
              </>
            )}
            
            {booking?.status === 'confirmed' && (
              <>
                <button
                  onClick={() => handleUpdateStatus('completed')}
                  disabled={loading}
                  className={`px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center transition-colors ${
                    loading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <FaCheckCircle className="mr-2" />
                  {loading ? 'Đang xử lý...' : 'Hoàn thành'}
                </button>
                
                <button
                  onClick={() => handleUpdateStatus('cancelled')}
                  disabled={loading}
                  className={`px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center transition-colors ${
                    loading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <FaTimesCircle className="mr-2" />
                  {loading ? 'Đang xử lý...' : 'Hủy đơn'}
                </button>
              </>
            )}
            
            {(booking?.status === 'completed' || booking?.status === 'cancelled') && (
              <div className="text-gray-500 italic py-3">
                Đơn đặt tour đã {booking.status === 'completed' ? 'hoàn thành' : 'bị hủy'}. 
                Không thể thực hiện thêm hành động nào.
              </div>
            )}
            
            {!booking?.status && (
              <div className="text-gray-500 italic py-3">
                Không có hành động khả dụng.
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default TourBookingDetailPage; 