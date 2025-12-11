import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { getReceptionistByUserId, deleteReceptionist, reactivateReceptionist } from '@/services/receptionistService';
import { getCurrentUserFromStorage, getToken } from '@/utils/auth';
import { apiCall } from '@/utils/api';
import { getAllAppointments } from '@/services/appointmentService';
import { getMedicalRecordByAppointment } from '@/services/medicalRecordService';

 
const ReceptionistProfile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  
  const [receptionist, setReceptionist] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDates, setFilterDates] = useState({ startDate: '', endDate: '' });
  const [revenueData, setRevenueData] = useState(null);
  const [showRevenueModal, setShowRevenueModal] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [loadingPrescription, setLoadingPrescription] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: '',
    phone: '',
    email: '',
    dob: '',
    gender: 'male',
    address: ''
  });
  const itemsPerPage = 10;

  // Hiển thị thông báo
  const showToast = (message, type) => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: '' });
    }, 3000);
  };

  // Áp dụng bộ lọc lên danh sách lịch hẹn
  const applyFilters = useCallback((appointmentsList) => {
    if (!appointmentsList) return;
    
    let filtered = [...appointmentsList];

    if (filterStatus !== 'all') {
      filtered = filtered.filter(apt => apt.status === filterStatus);
    }

    if (filterDates.startDate) {
      filtered = filtered.filter(apt => {
        const dateField = apt.appointment_time || apt.date;
        if (!dateField) return false;
        try {
          const aptDate = new Date(dateField);
          if (isNaN(aptDate.getTime())) return false;
          const aptDateStr = aptDate.toISOString().split('T')[0];
          return aptDateStr >= filterDates.startDate;
        } catch {
          return false;
        }
      });
    }
    if (filterDates.endDate) {
      filtered = filtered.filter(apt => {
        const dateField = apt.appointment_time || apt.date;
        if (!dateField) return false;
        try {
          const aptDate = new Date(dateField);
          if (isNaN(aptDate.getTime())) return false;
          const aptDateStr = aptDate.toISOString().split('T')[0];
          return aptDateStr <= filterDates.endDate;
        } catch {
          return false;
        }
      });
    }

    setFilteredAppointments(filtered);
    setCurrentPage(1);
  }, [filterStatus, filterDates]);

  // Tải danh sách lịch hẹn của lễ tân
  const loadAppointments = useCallback(async (receptionistUserId) => {
    try {
      const response = await getAllAppointments(1, 1000);
      if (response.success && response.data) {
        const appointmentsArray = Array.isArray(response.data) ? response.data : (response.data.appointments || []);
      
        const receptionistAppointments = appointmentsArray.filter(
          apt => apt.booked_by === receptionistUserId || 
                 apt.receptionist_id === receptionistUserId ||
                 apt.receptionist_id?._id === receptionistUserId ||
                 apt.pharmacist_id === receptionistUserId ||
                 apt.pharmacist_id?._id === receptionistUserId
        );
        setAppointments(receptionistAppointments);
        setFilteredAppointments(receptionistAppointments);
      }
    } catch (err) {
      console.error('Error loading appointments:', err);
      showToast('Không thể tải danh sách lịch hẹn', 'error');
    }
  }, []);

  // Xử lý thay đổi bộ lọc
  const handleFilterChange = () => {
    applyFilters(appointments);
  };

  // Xem đơn thuốc
  const handleViewPrescription = async (appointmentId) => {
    try {
      setLoadingPrescription(true);
      const response = await getMedicalRecordByAppointment(appointmentId);
      if (response.success && response.data) {
        setSelectedPrescription(response.data);
        setShowPrescriptionModal(true);
      } else {
        showToast('Không tìm thấy đơn thuốc cho lịch hẹn này', 'error');
      }
    } catch (err) {
      console.error('Error loading prescription:', err);
      showToast('Không thể tải đơn thuốc', 'error');
    } finally {
      setLoadingPrescription(false);
    }
  };

  // Tải dữ liệu doanh thu
  const loadRevenue = async () => {
    if (!receptionist?.user_info?._id) return;

    try {
      const startDate = filterDates.startDate || new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0];
      const endDate = filterDates.endDate || new Date().toISOString().split('T')[0];
      
      const receptionistAppointments = filteredAppointments.filter(apt => {
        if (apt.status !== 'completed') return false;
        if (!apt.pharmacist_id) return false; 
        return true;
      });

      const totalExaminationFee = receptionistAppointments.reduce((sum, apt) => {
        const fee = apt.examination_fee_id?.fee || apt.examination_fee || 0;
        return sum + fee;
      }, 0);

      let medicineIncome = 0;
      let totalMedicinesSold = 0;
      
      for (const apt of receptionistAppointments) {
        try {
          const recordResponse = await getMedicalRecordByAppointment(apt._id);
          if (recordResponse.success && recordResponse.data) {
            const record = recordResponse.data;
            if (record.status === 'dispensed' && record.medications_prescribed) {
              for (const med of record.medications_prescribed) {
                const price = med.medicine_id?.price || 0;
                const quantity = med.quantity || 0;
                medicineIncome += price * quantity;
                totalMedicinesSold += quantity;
              }
            }
          }
        } catch (err) {
          console.error('Error loading medical record for appointment:', apt._id, err);
        }
      }

      setRevenueData({
        totalAppointments: receptionistAppointments.length,
        completedAppointments: receptionistAppointments.length,
        examinationRevenue: totalExaminationFee,
        medicineRevenue: medicineIncome,
        totalMedicinesSold: totalMedicinesSold,
        totalRevenue: totalExaminationFee + medicineIncome,
        period: { startDate, endDate }
      });
      setShowRevenueModal(true);
    } catch (err) {
      console.error('Error loading revenue:', err);
      showToast('Không thể tải dữ liệu doanh thu', 'error');
    }
  };

  // Tải dữ liệu lễ tân
  useEffect(() => {
    const loadData = async () => {
      const current = getCurrentUserFromStorage();
      if (!current || current.role !== 'admin') {
        setError('Bạn không có quyền xem hồ sơ lễ tân này');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const res = await getReceptionistByUserId(userId);
        if (res.success && res.data) {
          setReceptionist(res.data);
          if (res.data.user_info?._id) {
            await loadAppointments(res.data.user_info._id);
          }
        } else {
          setError(res.error || 'Không tìm thấy lễ tân');
        }
      } catch (err) {
        console.error('Error loading receptionist:', err);
        setError('Lỗi khi tải hồ sơ lễ tân');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [userId, loadAppointments]);

  // format ngày sinh
  const formatDate = (dateString) => {
    if (!dateString) return 'Chưa có';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Chưa có';
      return date.toLocaleDateString('vi-VN');
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Chưa có';
    }
  };

  // Mở modal chỉnh sửa
  const openEditModal = () => {
    if (receptionist?.user_info) {
      const userInfo = receptionist.user_info;
      
      let formattedDob = '';
      if (userInfo.dob) {
        try {
          const dobDate = new Date(userInfo.dob);
          if (!isNaN(dobDate.getTime())) {
            formattedDob = dobDate.toISOString().split('T')[0];
          }
        } catch (error) {
          console.error('Error formatting dob:', error);
        }
      }
      
      setEditForm({
        full_name: userInfo.full_name || '',
        phone: userInfo.phone || '',
        email: userInfo.email || '',
        dob: formattedDob,
        gender: userInfo.gender || 'male',
        address: userInfo.address || ''
      });
      setShowEditModal(true);
    } else {
      showToast('Không tìm thấy thông tin lễ tân', 'error');
    }
  };

  // Xử lý thay đổi form chỉnh sửa
  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Xử lý lưu thay đổi thông tin lễ tân
  const handleSaveChanges = async () => {
    if (!receptionist?.user_info?._id) {
      showToast('Không tìm thấy thông tin người dùng', 'error');
      return;
    }

    try {
      setIsSaving(true);
      
      const token = getToken();
      if (!token) {
        showToast('Vui lòng đăng nhập lại', 'error');
        return;
      }

      const updateData = { ...editForm };
      
      const result = await apiCall(`/users/${receptionist.user_info._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      });

      if (result.success) {

        const updatedReceptionist = await getReceptionistByUserId(userId);
        if (updatedReceptionist.success) {
          setReceptionist(updatedReceptionist.data);
        }
        
        showToast('Cập nhật thông tin thành công!', 'success');
        setShowEditModal(false);
      } else {
        showToast(result.error || 'Không thể cập nhật thông tin', 'error');
      }
    } catch (error) {
      console.error('Error updating receptionist info:', error);
      showToast('Lỗi khi cập nhật thông tin', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!receptionist?._id) return;

    if (!confirm('Bạn có chắc muốn xóa lễ tân này? Hành động không thể hoàn tác.')) return;

    try {
      setIsDeleting(true);
      const res = await deleteReceptionist(receptionist._id);
      if (res.success) {
        showToast('Xóa lễ tân thành công', 'success');
        navigate('/admin');
      } else {
        showToast(res.error || 'Xóa lễ tân thất bại', 'error');
      }
    } catch (err) {
      console.error('Error deleting receptionist:', err);
      showToast('Có lỗi xảy ra khi xóa', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleReactivate = async () => {
    if (!receptionist?._id) return;

    if (!confirm('Bạn có chắc muốn kích hoạt lại tài khoản lễ tân này?')) return;

    try {
      setIsDeleting(true);
      const res = await reactivateReceptionist(receptionist._id);
      if (res.success) {
        showToast('Đã kích hoạt lại tài khoản thành công', 'success');
        
        const receptionistRes = await getReceptionistByUserId(userId);
        if (receptionistRes.success && receptionistRes.data) {
          setReceptionist(receptionistRes.data);
        }
      } else {
        showToast(res.error || 'Kích hoạt lại thất bại', 'error');
      }
    } catch (err) {
      console.error('Error reactivating receptionist:', err);
      showToast('Có lỗi xảy ra khi kích hoạt lại', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen w-full bg-white relative overflow-hidden p-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Đang tải hồ sơ lễ tân...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen w-full bg-white relative overflow-hidden p-6">
        <div className="max-w-6xl mx-auto">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <div className="text-6xl mb-4">❌</div>
                <h2 className="text-xl font-semibold text-gray-800 mb-2">Lỗi</h2>
                <p className="text-gray-600">{error}</p>
                <Button onClick={() => navigate(-1)} className="mt-4">Quay lại</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const user = receptionist?.user_info;

  return (
    <div className="min-h-screen w-full bg-white relative overflow-hidden p-6">
      {/* Thông báo */}
      {toast.show && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
          toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        } text-white animate-slide-in-right`}>
          <div className="flex items-center gap-2">
            <span>{toast.type === 'success' ? '✓' : '✗'}</span>
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `
            radial-gradient(circle 600px at 0% 200px, #bfdbfe, transparent),
            radial-gradient(circle 600px at 100% 200px, #bfdbfe, transparent)
          `,
        }}
      />

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="mb-6 flex items-center justify-between">
          <Button onClick={() => navigate(-1)} variant="outline" className="flex items-center gap-2">
            <span>←</span>
            Quay lại
          </Button>
          <h1 className="text-2xl font-bold text-gray-800">Hồ sơ lễ tân</h1>
          <div className="w-24"></div>
        </div>

  <Card className="border-2 border-blue-200 shadow-lg relative z-10">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                  {user?.full_name?.charAt(0) || 'R'}
                </div>
                <div>
                  <CardTitle className="text-2xl mb-2">{user?.full_name || 'Chưa có tên'}</CardTitle>
                  <div className="flex gap-2">
                    <Badge className="bg-blue-100 text-blue-800">Lễ tân</Badge>
                    <Badge className={user?.employment_status === false ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}>
                      {user?.employment_status === false ? 'Đã nghỉ việc' : 'Đang làm việc'}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={openEditModal} 
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Chỉnh sửa
                </Button>
                {getCurrentUserFromStorage()?.role === 'admin' && (
                  <>
                    {user?.employment_status === false ? (
                      <Button 
                        onClick={handleReactivate}
                        disabled={isDeleting}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        {isDeleting ? 'Đang xử lý...' : '🔄 Kích hoạt lại'}
                      </Button>
                    ) : (
                      <Button 
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        {isDeleting ? 'Đang xóa...' : '🗑️ Xóa lễ tân'}
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-700 mb-3 border-b pb-2">Thông tin cá nhân</h3>
                <InfoRow label="Email" value={user?.email || 'Chưa có'} />
                <InfoRow label="Số điện thoại" value={user?.phone || 'Chưa có'} />
                <InfoRow label="Ngày sinh" value={formatDate(user?.dob)} />
                <InfoRow label="Giới tính" value={user?.gender === 'male' ? 'Nam' : 'Nữ'} />
                <InfoRow label="Địa chỉ" value={user?.address || 'Chưa có'} />
                <InfoRow label="Tình trạng làm việc" value={user?.employment_status === false ? 'Đã nghỉ việc' : 'Đang làm việc'} />
                <InfoRow label="Ngày tạo hồ sơ" value={formatDate(receptionist?.createdAt)} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Phần Lọc và Thống Kê */}
        <Card className="mb-6 border-2 border-blue-200 shadow-lg relative z-10">
          <CardHeader className="bg-transparent">
            <CardTitle className="text-xl">Lọc lịch hẹn và thống kê</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div>
                <Label htmlFor="startDate">Từ ngày</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={filterDates.startDate}
                  onChange={(e) => setFilterDates(prev => ({ ...prev, startDate: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="endDate">Đến ngày</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={filterDates.endDate}
                  onChange={(e) => setFilterDates(prev => ({ ...prev, endDate: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="status">Trạng thái</Label>
                <select
                  id="status"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 h-10"
                >
                  <option value="all">Tất cả</option>
                  <option value="booked">Đã đặt</option>
                  <option value="checked">Đã check-in</option>
                  <option value="completed">Hoàn thành</option>
                  <option value="cancelled">Đã hủy</option>
                </select>
              </div>
              <div className="flex items-end gap-2">
                <Button
                  onClick={handleFilterChange}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  Lọc
                </Button>
                <Button
                  onClick={loadRevenue}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  Doanh thu
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Danh sách lịch hẹn */}
        <Card className="mb-6 border-2 border-purple-200 shadow-lg relative z-10">
          <CardHeader className="bg-transparent">
            <CardTitle className="text-xl">Danh sách lịch hẹn ({filteredAppointments.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredAppointments.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p>Không có lịch hẹn nào</p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {filteredAppointments
                    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                    .map((appointment) => (
                      <div
                        key={appointment._id}
                        className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Bệnh nhân</div>
                            <div className="font-medium">{appointment.patient_id?.user_id?.full_name || 'Chưa có tên'}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Ngày hẹn</div>
                            <div className="font-medium">
                              {appointment.appointment_time || appointment.date 
                                ? new Date(appointment.appointment_time || appointment.date).toLocaleDateString('vi-VN') 
                                : 'Chưa có'}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Giờ hẹn</div>
                            <div className="font-medium">
                              {appointment.appointment_time 
                                ? new Date(appointment.appointment_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                                : appointment.time || 'Chưa có'}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Trạng thái</div>
                            <Badge
                              className={
                                appointment.status === 'completed'
                                  ? 'bg-green-100 text-green-800'
                                  : appointment.status === 'cancelled'
                                  ? 'bg-red-100 text-red-800'
                                  : appointment.status === 'checked'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }
                            >
                              {appointment.status === 'completed'
                                ? 'Hoàn thành'
                                : appointment.status === 'cancelled'
                                ? 'Đã hủy'
                                : appointment.status === 'checked'
                                ? 'Đã check-in'
                                : 'Đã đặt'}
                            </Badge>
                            {appointment.status === 'completed' && (
                              <div className="mt-2">
                                <Button
                                  onClick={() => handleViewPrescription(appointment._id)}
                                  disabled={loadingPrescription}
                                  className="bg-blue-600 hover:bg-blue-700 text-white h-8 px-3 text-xs w-full"
                                >
                                  {loadingPrescription ? 'Đang tải...' : 'Xem đơn thuốc'}
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                        {appointment.symptoms && (
                          <div className="mt-2 pt-2 border-t border-gray-100">
                            <div className="text-xs text-gray-500">Triệu chứng</div>
                            <div className="text-sm">{appointment.symptoms}</div>
                          </div>
                        )}
                        {(appointment.examination_fee_id?.fee || appointment.examination_fee) && (
                          <div className="mt-2 pt-2 border-t border-gray-100">
                            <div className="text-xs text-gray-500">Phí khám</div>
                            <div className="text-sm font-medium text-green-600">
                              {(appointment.examination_fee_id?.fee || appointment.examination_fee || 0).toLocaleString('vi-VN')} VNĐ
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                </div>

                {/* Pagination */}
                {filteredAppointments.length > itemsPerPage && (
                  <div className="mt-6 flex justify-center">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                        {[...Array(Math.ceil(filteredAppointments.length / itemsPerPage))].map((_, idx) => (
                          <PaginationItem key={idx}>
                            <PaginationLink
                              onClick={() => setCurrentPage(idx + 1)}
                              isActive={currentPage === idx + 1}
                              className="cursor-pointer"
                            >
                              {idx + 1}
                            </PaginationLink>
                          </PaginationItem>
                        ))}
                        <PaginationItem>
                          <PaginationNext
                            onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredAppointments.length / itemsPerPage), prev + 1))}
                            className={currentPage === Math.ceil(filteredAppointments.length / itemsPerPage) ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Thống kê doanh thu */}
      {showRevenueModal && revenueData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Báo cáo doanh thu</h2>
                <button
                  onClick={() => setShowRevenueModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 mb-2">Khoảng thời gian</div>
                  <div className="font-medium">
                    {new Date(revenueData.period.startDate).toLocaleDateString('vi-VN')} - {new Date(revenueData.period.endDate).toLocaleDateString('vi-VN')}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600 mb-2">Tổng số lịch hẹn</div>
                    <div className="text-3xl font-bold text-green-600">{revenueData.totalAppointments}</div>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600 mb-2">Lịch hoàn thành</div>
                    <div className="text-3xl font-bold text-blue-600">{revenueData.completedAppointments}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600 mb-2">Thu nhập từ khám bệnh</div>
                    <div className="text-2xl font-bold text-purple-600">
                      {revenueData.examinationRevenue.toLocaleString('vi-VN')} VNĐ
                    </div>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600 mb-2">Thu nhập từ thuốc ({revenueData.totalMedicinesSold || 0} đơn vị)</div>
                    <div className="text-2xl font-bold text-orange-600">
                      {revenueData.medicineRevenue.toLocaleString('vi-VN')} VNĐ
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-lg border-2 border-green-200">
                  <div className="text-sm text-gray-600 mb-2">Tổng doanh thu</div>
                  <div className="text-4xl font-bold text-green-600">
                    {revenueData.totalRevenue.toLocaleString('vi-VN')} VNĐ
                  </div>
                  <div className="text-xs text-white mt-2">
                    Khám bệnh + Thuốc
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <Button
                  onClick={() => setShowRevenueModal(false)}
                  className="w-full bg-gray-600 hover:bg-gray-700 text-white"
                >
                  Đóng
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Xem đơn thuốc */}
      {showPrescriptionModal && selectedPrescription && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Đơn thuốc</h2>
                <button
                  onClick={() => setShowPrescriptionModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Bệnh nhân</div>
                      <div className="font-medium">{selectedPrescription.patient_id?.user_id?.full_name || 'Chưa có'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Bác sĩ</div>
                      <div className="font-medium">{selectedPrescription.doctor_id?.user_id?.full_name || 'Chưa có'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Ngày khám</div>
                      <div className="font-medium">{formatDate(selectedPrescription.createdAt)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Trạng thái</div>
                      <div className="font-medium">
                        <Badge className={selectedPrescription.status === 'dispensed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                          {selectedPrescription.status === 'dispensed' ? 'Đã xuất thuốc' : 'Chưa xuất thuốc'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {selectedPrescription.diagnosis && (
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600 mb-2">Chẩn đoán</div>
                    <div className="font-medium">{selectedPrescription.diagnosis}</div>
                  </div>
                )}

                {selectedPrescription.symptoms && (
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600 mb-2">Triệu chứng</div>
                    <div className="font-medium">{selectedPrescription.symptoms}</div>
                  </div>
                )}

                <div>
                  <h3 className="font-semibold text-lg mb-3">Danh sách thuốc</h3>
                  {selectedPrescription.medications_prescribed && selectedPrescription.medications_prescribed.length > 0 ? (
                    <div className="space-y-3">
                      {selectedPrescription.medications_prescribed.map((med, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div>
                              <div className="text-xs text-gray-500 mb-1">Tên thuốc</div>
                              <div className="font-medium">{med.medicine_id?.name || 'Chưa có'}</div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-500 mb-1">Số lượng</div>
                              <div className="font-medium">{med.quantity} {med.medicine_id?.unit || 'viên'}</div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-500 mb-1">Liều lượng</div>
                              <div className="font-medium">{med.dosage || 'Chưa có'}</div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-500 mb-1">Giá</div>
                              <div className="font-medium text-green-600">
                                {(med.medicine_id?.price || 0).toLocaleString('vi-VN')} VNĐ
                              </div>
                            </div>
                          </div>
                          {med.instructions && (
                            <div className="mt-2 pt-2 border-t border-gray-100">
                              <div className="text-xs text-gray-500">Hướng dẫn sử dụng</div>
                              <div className="text-sm">{med.instructions}</div>
                            </div>
                          )}
                        </div>
                      ))}
                      <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold">Tổng tiền thuốc:</span>
                          <span className="text-xl font-bold text-green-600">
                            {selectedPrescription.medications_prescribed.reduce((sum, med) => 
                              sum + (med.quantity * (med.medicine_id?.price || 0)), 0
                            ).toLocaleString('vi-VN')} VNĐ
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p>Không có thuốc được kê đơn</p>
                    </div>
                  )}
                </div>

                {selectedPrescription.notes && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600 mb-2">Ghi chú</div>
                    <div className="text-sm">{selectedPrescription.notes}</div>
                  </div>
                )}
              </div>

              <div className="mt-6">
                <Button
                  onClick={() => setShowPrescriptionModal(false)}
                  className="w-full bg-gray-600 hover:bg-gray-700 text-white"
                >
                  Đóng
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal chỉnh sửa thông tin */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Chỉnh sửa thông tin</h2>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                  disabled={isSaving}
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="full_name">Họ và tên *</Label>
                  <Input
                    id="full_name"
                    name="full_name"
                    value={editForm.full_name}
                    onChange={handleEditFormChange}
                    placeholder="Nhập họ và tên"
                    disabled={isSaving}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">Số điện thoại *</Label>
                    <Input
                      id="phone"
                      name="phone"
                      value={editForm.phone}
                      onChange={handleEditFormChange}
                      placeholder="Nhập số điện thoại"
                      disabled={isSaving}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={editForm.email}
                      onChange={handleEditFormChange}
                      placeholder="Nhập email"
                      disabled={isSaving}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="dob">Ngày sinh *</Label>
                    <Input
                      id="dob"
                      name="dob"
                      type="date"
                      value={editForm.dob}
                      onChange={handleEditFormChange}
                      disabled={isSaving}
                    />
                  </div>
                  <div>
                    <Label htmlFor="gender">Giới tính *</Label>
                    <select
                      id="gender"
                      name="gender"
                      value={editForm.gender}
                      onChange={handleEditFormChange}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      disabled={isSaving}
                    >
                      <option value="male">Nam</option>
                      <option value="female">Nữ</option>
                    </select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="address">Địa chỉ</Label>
                  <Input
                    id="address"
                    name="address"
                    value={editForm.address}
                    onChange={handleEditFormChange}
                    placeholder="Nhập địa chỉ"
                    disabled={isSaving}
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  onClick={handleSaveChanges}
                  disabled={isSaving}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </Button>
                <Button
                  onClick={() => setShowEditModal(false)}
                  variant="outline"
                  disabled={isSaving}
                  className="flex-1"
                >
                  Hủy
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const InfoRow = ({ label, value }) => (
  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
    <div className="flex-1">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="text-sm font-medium text-gray-800">{value}</div>
    </div>
  </div>
);

export default ReceptionistProfile;
