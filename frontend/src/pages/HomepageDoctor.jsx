import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { getAppointmentsByDate, completeAppointment } from '@/services/appointmentService.js';
import { createMedicalRecord } from '@/services/medicalRecordService.js';
import { toggleDoctorStatus } from '@/services/doctorService.js';
import { getMedicines } from '@/services/medicineService.js';
import { searchPatients } from '@/services/patientService.js';
import { getCurrentUserFromStorage, logout } from '@/utils/auth.js';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import logo from '@/assets/logo.png';

const HomepageDoctor = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [_doctorInfo, setDoctorInfo] = useState(null);
  const [isOnline, setIsOnline] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showMedicalRecordForm, setShowMedicalRecordForm] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [availableMedicines, setAvailableMedicines] = useState([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [patientResults, setPatientResults] = useState([]);
  const [isSearchingPatients, setIsSearchingPatients] = useState(false);
  const itemsPerPage = 10;

  const [medicalRecordForm, setMedicalRecordForm] = useState({
    symptoms: '',
    diagnosis: '',
    treatment: '',
    follow_up: '',
    notes: '',
    medications: [{
      medicine_id: '',
      medicine_name: '',
      dosage: '',
      frequency: '',
      duration: '',
      quantity: '',
      instructions: '',
      stock_quantity: 0,
      unit: 'viên',
      searchTerm: ''
    }]
  });

  // Kiểm tra thuốc đã hết hạn
  const isExpired = (expiryDate) => {
    try {
      const exp = new Date(expiryDate);
      const today = new Date();
      exp.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);
      return exp <= today;
    } catch {
      return false;
    }
  };


  // Tạo chuỗi ngày local YYYY-MM-DD
  const getLocalDateString = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Tải lịch hẹn hôm nay
  const loadTodayAppointments = useCallback(async () => {
    setIsLoading(true);
    try {

      const today = getLocalDateString();
      const result = await getAppointmentsByDate(today);
      
      if (result.success && result.data) {
        const user = getCurrentUserFromStorage();
        const doctorData = user.roleInfo || user.doctor_id;
        
        
        const doctorAppointments = result.data.filter(
          apt => apt.doctor_id?._id === doctorData?._id
        );
      
        const filteredAppointments = doctorAppointments.filter(
          apt => apt.status !== 'cancelled'
        );
        
        // Sắp xếp theo thứ tự ưu tiên:
        // 1. Chờ khám (checked) - ưu tiên cao nhất
        // 2. Trễ hẹn (late)
        // 3. Đặt lịch (booked)
        // 4. Hoàn thành (completed) - xuống dưới cùng
        const statusPriority = {
          'checked': 1,
          'late': 2,
          'booked': 3,
          'completed': 4
        };
        
        const sortedAppointments = filteredAppointments.sort((a, b) => {
          const priorityA = statusPriority[a.status] || 5;
          const priorityB = statusPriority[b.status] || 5;
        
          if (priorityA !== priorityB) {
            return priorityA - priorityB;
          }

          if (a.status === 'checked' && b.status === 'checked') {
            return new Date(a.updatedAt) - new Date(b.updatedAt);
          }
        
          return new Date(a.appointment_time) - new Date(b.appointment_time);
        });
        
        setAppointments(sortedAppointments);
      } else {
        showToast(result.error || 'Không thể tải danh sách lịch hẹn', 'error');
      }
    } catch (error) {
      console.error('Error loading appointments:', error);
      showToast('Lỗi khi tải danh sách lịch hẹn', 'error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Tải thông tin người dùng và lịch hẹn khi component mount
  useEffect(() => {
    const user = getCurrentUserFromStorage();
    if (!user) {
      showToast('Chưa đăng nhập. Vui lòng đăng nhập lại.', 'error');
      setTimeout(() => navigate('/login'), 2000);
      return;
    }
    
    if (user.role !== 'doctor') {
      showToast('Bạn không có quyền truy cập trang này', 'error');
      switch (user.role) {
        case 'patient':
          setTimeout(() => navigate('/'), 2000);
          break;
        case 'receptionist':
          setTimeout(() => navigate('/receptionist'), 2000);
          break;
        default:
          setTimeout(() => navigate('/login'), 2000);
      }
      return;
    }
    
    // Đảm bảo có cả id và _id ngay từ đầu
    const normalizedUser = {
      ...user,
      id: user.id || user._id,
      _id: user._id || user.id
    };
  
    localStorage.setItem('currentUser', JSON.stringify(normalizedUser));
    
    setCurrentUser(normalizedUser);
    const doctorData = normalizedUser.roleInfo || normalizedUser.doctor_id;
    setDoctorInfo(doctorData);
    
    if (doctorData?.is_active !== undefined) {
      setIsOnline(doctorData.is_active);
    }
    
    loadTodayAppointments();
  }, [navigate, loadTodayAppointments]);

  // Tự động làm mới danh sách lịch hẹn mỗi 30 giây
  useAutoRefresh(loadTodayAppointments, [], 30000);

  // Hiển thị thông báo
  const showToast = (message, type) => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: '' });
    }, 3000);
  };

  // Xử lý thay đổi form hồ sơ bệnh án
  const handleMedicalRecordChange = (e) => {
    const { name, value } = e.target;
    setMedicalRecordForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Xử lý thay đổi thuốc trong hồ sơ bệnh án
  const handleMedicalRecordMedicationChange = (index, field, value) => {
    setMedicalRecordForm(prev => ({
      ...prev,
      medications: prev.medications.map((med, i) => 
        i === index ? { ...med, [field]: value } : med
      )
    }));
  };

  // Thêm thuốc mới vào hồ sơ bệnh án
  const handleAddMedicalRecordMedication = () => {
    setMedicalRecordForm(prev => ({
      ...prev,
      medications: [...prev.medications, {
        medicine_id: '',
        medicine_name: '',
        dosage: '',
        frequency: '',
        duration: '',
        quantity: '',
        instructions: '',
        stock_quantity: 0,
        unit: 'viên',
        searchTerm: ''
      }]
    }));
  };

  // Xóa thuốc khỏi hồ sơ bệnh án
  const handleRemoveMedicalRecordMedication = (index) => {
    setMedicalRecordForm(prev => ({
      ...prev,
      medications: prev.medications.filter((_, i) => i !== index)
    }));
  };

  // Xử lý chọn thuốc cho hồ sơ bệnh án
  const handleSelectMedicineForMedicalRecord = (index, medicineId) => {
    if (!medicineId) {
      setMedicalRecordForm(prev => ({
        ...prev,
        medications: prev.medications.map((med, i) => 
          i === index ? {
            ...med,
            medicine_id: '',
            medicine_name: '',
            stock_quantity: 0,
            unit: 'viên'
          } : med
        )
      }));
      return;
    }

    // Xử lý chọn thuốc cho hồ sơ bệnh án
    const selectedMedicine = availableMedicines.find(med => med._id === medicineId);
    if (selectedMedicine) {
      setMedicalRecordForm(prev => {
        const updatedMedications = [...prev.medications];
        updatedMedications[index] = {
          ...updatedMedications[index],
          medicine_id: selectedMedicine._id,
          medicine_name: selectedMedicine.drug_name || selectedMedicine.medicine_name,
          stock_quantity: selectedMedicine.stock_quantity,
          unit: selectedMedicine.unit || 'viên'
        };
        return {
          ...prev,
          medications: updatedMedications
        };
      });
      showToast(`Đã chọn: ${selectedMedicine.drug_name || selectedMedicine.medicine_name}`, 'success');
    }
  };




  // Tải danh sách thuốc có sẵn
  const loadAvailableMedicines = async () => {
    try {
      const result = await getMedicines(1, 1000);
      if (result.success && result.data?.medicines) {
        const inStockMedicines = result.data.medicines.filter(
          med => med.stock_quantity > 0 && !isExpired(med.expiry_date) && med.is_active !== false
        );
        setAvailableMedicines(inStockMedicines);
      } else {
        showToast('Không thể tải danh sách thuốc', 'error');
      }
    } catch (error) {
      console.error('Error loading medicines:', error);
      showToast('Lỗi khi tải danh sách thuốc', 'error');
    }
  };


  // Lọc thuốc theo search term của từng medication
  const getFilteredMedicines = (searchTerm) => {
    if (!searchTerm || !searchTerm.trim()) {
      return availableMedicines;
    }
    const term = searchTerm.toLowerCase();
    return availableMedicines.filter(med => {
      const name = (med.drug_name || med.medicine_name || '').toLowerCase();
      return name.includes(term);
    });
  };

  // Xử lý lưu hồ sơ bệnh án
  const handleSaveMedicalRecord = async () => {
  
    if (!isOnline) {
      showToast('Bác sĩ đang offline. Vui lòng chuyển sang chế độ online để lưu hồ sơ', 'error');
      return;
    }

    if (!selectedAppointment) {
      showToast('Không có thông tin lịch hẹn', 'error');
      return;
    }

    if (!medicalRecordForm.diagnosis.trim()) {
      showToast('Vui lòng nhập chẩn đoán', 'error');
      return;
    }

    if (!medicalRecordForm.treatment.trim()) {
      showToast('Vui lòng nhập phương pháp điều trị', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const doctorData = currentUser.roleInfo || currentUser.doctor_id;
      
      const validMedications = medicalRecordForm.medications.filter(med => 
        med.medicine_id && 
        med.dosage && 
        med.frequency && 
        med.duration && 
        med.quantity && 
        parseInt(med.quantity) > 0
      ).map(med => ({
        medicine_id: med.medicine_id,
        medicine_name: med.medicine_name,
        dosage: med.dosage.trim(),
        frequency: med.frequency.trim(),
        duration: med.duration.trim(),
        quantity: parseInt(med.quantity),
        instructions: med.instructions?.trim() || ''
      }));
      
      const medicalRecordData = {
        patient_id: selectedAppointment.patient_id?._id,
        doctor_id: doctorData?._id,
        appointment_id: selectedAppointment._id,
        diagnosis: medicalRecordForm.diagnosis.trim(),
        treatment: medicalRecordForm.treatment.trim(),
        symptoms: medicalRecordForm.symptoms?.trim() || '',
        follow_up_recommendations: medicalRecordForm.follow_up?.trim() || '',
        medications_prescribed: validMedications,
        notes: medicalRecordForm.notes?.trim() || ''
      };

      const result = await createMedicalRecord(medicalRecordData);
      console.log('Medical record created:', result);
      
      if (result.success) {
        console.log('Attempting to complete appointment:', selectedAppointment._id);
  const completeResult = await completeAppointment(selectedAppointment._id, '');
        console.log('Complete appointment result:', completeResult);
        
        if (completeResult.success) {
          showToast('Hồ sơ bệnh án đã được lưu và lịch hẹn đã hoàn thành!', 'success');
        } else {
          showToast('Hồ sơ bệnh án đã lưu nhưng không thể cập nhật trạng thái lịch hẹn', 'error');
          console.error('Error completing appointment:', completeResult.error);
        }
        
        console.log('Reloading appointments...');
        await loadTodayAppointments();
        console.log('Appointments reloaded');
        
        setShowMedicalRecordForm(false);
        
        setMedicalRecordForm({
          symptoms: '',
          diagnosis: '',
          treatment: '',
          follow_up: '',
          notes: '',
          medications: [{
            medicine_id: '',
            medicine_name: '',
            dosage: '',
            frequency: '',
            duration: '',
            quantity: '',
            instructions: '',
            stock_quantity: 0,
            unit: 'viên',
            searchTerm: ''
          }]
        });
      } else {
        showToast(result.error || 'Không thể lưu hồ sơ bệnh án', 'error');
      }
    } catch (error) {
      console.error('Error saving medical record:', error);
      showToast('Lỗi khi lưu hồ sơ bệnh án', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Hiển thị badge trạng thái
  const getStatusBadge = (status) => {
    const statusConfig = {
      booked: { variant: 'default', text: 'Đã đặt', color: 'bg-yellow-100 text-yellow-800' },
      checked: { variant: 'default', text: 'Chờ khám', color: 'bg-blue-100 text-blue-800' },
      completed: { variant: 'default', text: 'Hoàn thành', color: 'bg-gray-100 text-gray-800' },
      cancelled: { variant: 'default', text: 'Đã hủy', color: 'bg-red-100 text-red-800' },
      late: { variant: 'default', text: 'Trễ hẹn', color: 'bg-orange-100 text-orange-800' }
    };
    const config = statusConfig[status] || { variant: 'default', text: status, color: 'bg-gray-100 text-gray-800' };
    return <Badge className={config.color}>{config.text}</Badge>;
  };

  // Định dạng ngày tháng
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Chưa có';
      return date.toLocaleDateString('vi-VN');
    } catch {
      return 'Chưa có';
    }
  };

  // Định dạng giờ
  const formatTime = (dateString) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Chưa có';
      return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Chưa có';
    }
  };

  const handleLogout = () => {
    logout();
  };

  // Xử lý chuyển đổi trạng thái online/offline của bác sĩ
  const handleToggleOnlineStatus = async () => {
    const doctorData = currentUser?.roleInfo || currentUser?.doctor_id;
    
    if (!doctorData?._id) {
      showToast('Không tìm thấy thông tin bác sĩ', 'error');
      console.error('Missing doctor ID. currentUser:', currentUser);
      console.error('doctorData:', doctorData);
      return;
    }

    setIsLoading(true);
    try {
      const newStatus = !isOnline;
      const result = await toggleDoctorStatus(doctorData._id, newStatus);
      
      if (result.success) {
        setIsOnline(newStatus);
        showToast(
          result.message || `Đã chuyển sang chế độ ${newStatus ? 'Online' : 'Offline'}`, 
          'success'
        );
        
        const normalizedUser = {
          ...currentUser,
          id: currentUser.id || currentUser._id,
          _id: currentUser._id || currentUser.id
        };
        
        if (normalizedUser.roleInfo) {
          normalizedUser.roleInfo = {
            ...normalizedUser.roleInfo,
            is_active: newStatus
          };
        }
        
        if (normalizedUser.doctor_id) {
          normalizedUser.doctor_id = {
            ...normalizedUser.doctor_id,
            is_active: newStatus
          };
        }
        
        localStorage.setItem('currentUser', JSON.stringify(normalizedUser));
        setCurrentUser(normalizedUser);
      } else {
        showToast(result.error || 'Không thể thay đổi trạng thái', 'error');
      }
    } catch (error) {
      console.error('Error toggling status:', error);
      showToast('Lỗi khi thay đổi trạng thái', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Mở form hồ sơ bệnh án
  const handleOpenMedicalRecordForm = async (appointment) => {
  
    if (!isOnline) {
      showToast('Bác sĩ đang offline. Vui lòng chuyển sang chế độ online để khám bệnh', 'error');
      return;
    }

    setSelectedAppointment(appointment);
    setMedicalRecordForm({
      symptoms: '',
      diagnosis: '',
      treatment: '',
      follow_up: '',
      notes: '',
      medications: [{
        medicine_id: '',
        medicine_name: '',
        dosage: '',
        frequency: '',
        duration: '',
        quantity: '',
        instructions: '',
        stock_quantity: 0,
        unit: 'viên',
        searchTerm: ''
      }]
    });
    await loadAvailableMedicines();
    setShowMedicalRecordForm(true);
  };

  const totalPages = Math.ceil(appointments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedAppointments = appointments.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Tìm kiếm bệnh nhân cho bác sĩ
  const handleSearchPatients = useCallback(async (termRaw) => {
    const term = (termRaw || '').trim();
    if (!term) {
      setPatientResults([]);
      return;
    }
    setIsSearchingPatients(true);
    try {
      const result = await searchPatients(term);
      if (result.success) {
        setPatientResults(result.data || []);
      } else {
        setPatientResults([]);
        showToast(result.error || 'Không thể tìm kiếm bệnh nhân', 'error');
      }
    } catch (error) {
      console.error('Error searching patients:', error);
      setPatientResults([]);
      showToast('Lỗi khi tìm kiếm bệnh nhân', 'error');
    } finally {
      setIsSearchingPatients(false);
    }
  }, []);

  // Tự động tìm kiếm với debounce khi người dùng gõ
  useEffect(() => {
    if (!patientSearch.trim()) {
      setPatientResults([]);
      return;
    }
    const t = setTimeout(() => {
      handleSearchPatients(patientSearch);
    }, 400);
    return () => clearTimeout(t);
  }, [patientSearch, handleSearchPatients]);

  return (
    <div className="min-h-screen w-full bg-white relative overflow-hidden">
      {toast.show && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-md shadow-lg max-w-sm ${
          toast.type === 'success' 
            ? 'bg-green-100 border border-green-400 text-green-700' 
            : 'bg-red-100 border border-red-400 text-red-700'
        }`}>
          <div className="flex items-center">
            <div className={`w-2 h-2 rounded-full mr-2 ${
              toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
            }`}></div>
            <span className="text-sm font-medium">{toast.message}</span>
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

      <div className="relative z-10 min-h-screen">
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center gap-4">
                <img 
                  src={logo} 
                  alt="Logo Phòng khám" 
                  className="h-12 w-12 object-contain rounded-full"
                />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Trang chủ Bác sĩ</h1>
                  <p className="text-sm text-gray-600">
                    Chào mừng, {currentUser?.full_name || 'Bác sĩ'}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <Button 
                  variant={isOnline ? "default" : "outline"}
                  size="sm" 
                  onClick={handleToggleOnlineStatus}
                  disabled={isLoading}
                  className={`transition-all duration-300 ${isOnline ? "bg-green-600 hover:bg-green-700 shadow-lg" : "hover:bg-gray-100"}`}
                  title={`Click để chuyển sang chế độ ${isOnline ? 'Offline' : 'Online'}`}
                >
                  <span className="flex items-center space-x-2">
                    <span className={`w-2 h-2 rounded-full animate-pulse ${isOnline ? 'bg-white' : 'bg-gray-400'}`}></span>
                    <span className="font-medium">{isOnline ? '🟢 Online' : '⚫ Offline'}</span>
                  </span>
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate('/setting')}>
                  Cài đặt
                </Button>
                <Button variant="destructive" size="sm" onClick={handleLogout}>
                  Đăng xuất
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-4 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Lịch khám hôm nay</h2>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Trạng thái:</span>
                <Badge className={`${isOnline ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                  <span className="flex items-center space-x-1">
                    <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-600 animate-pulse' : 'bg-gray-400'}`}></span>
                    <span>{isOnline ? 'Đang hoạt động' : 'Không hoạt động'}</span>
                  </span>
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Lịch hẹn */}
          <div className="space-y-6">
            {/* Tìm kiếm bệnh nhân */}
            <Card className="border-2 border-gray-300">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Tìm kiếm bệnh nhân</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Nhập tên hoặc số điện thoại..."
                      value={patientSearch}
                      onChange={(e) => setPatientSearch(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSearchPatients(e.currentTarget.value);
                        }
                      }}
                      className="flex-1"
                    />
                    <Button
                      onClick={() => handleSearchPatients(patientSearch)}
                      disabled={isSearchingPatients || !patientSearch.trim()}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {isSearchingPatients ? 'Đang tìm...' : 'Tìm kiếm'}
                    </Button>
                  </div>

                  {patientResults.length > 0 && (
                    <div className="mt-2 max-h-60 overflow-y-auto">
                      <div className="text-sm text-gray-700 mb-2">Kết quả ({patientResults.length}):</div>
                      {patientResults.map((patient) => (
                        <div
                          key={patient._id}
                          className="p-3 border rounded mb-2 hover:bg-blue-50 hover:border-blue-300 cursor-pointer transition-all duration-200"
                          onClick={() => {
                            const uid = patient.user_id?._id;
                            if (uid) {
                              navigate(`/patient/${uid}`);
                            } else {
                              showToast('Không thể xem thông tin bệnh nhân này', 'error');
                            }
                          }}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="font-medium text-sm text-gray-800">{patient.user_id?.full_name || 'Chưa có tên'}</div>
                              <div className="text-xs text-gray-600">📞 SĐT: {patient.user_id?.phone || 'Chưa có SĐT'}</div>
                              {patient.user_id?.dob && (
                                <div className="text-xs text-gray-600">🎂 Sinh: {formatDate(patient.user_id.dob)}</div>
                              )}
                              {patient.user_id?.address && (
                                <div className="text-xs text-gray-500 mt-1">📍 {patient.user_id.address}</div>
                              )}
                            </div>
                            <div className="text-blue-500 text-xs ml-2">Xem →</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {isSearchingPatients && patientSearch.trim() && (
                    <div className="mt-2 text-center py-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-2"></div>
                      <p className="text-sm text-gray-500">Đang tìm kiếm...</p>
                    </div>
                  )}

                  {patientSearch.trim() && patientResults.length === 0 && !isSearchingPatients && (
                    <div className="mt-2 text-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                      <div className="text-4xl mb-2">🔍</div>
                      <p className="text-sm text-gray-600 font-medium">Không tìm thấy bệnh nhân</p>
                      <p className="text-xs text-gray-500 mt-1">Thử tìm kiếm với từ khóa khác</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Danh sách lịch khám</h2>
              <div className="flex items-center space-x-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={loadTodayAppointments}
                  disabled={isLoading}
                >
                  {isLoading ? 'Đang tải...' : '🔄 Làm mới'}
                </Button>
                <span className="text-sm text-gray-600">
                  {formatDate(new Date().toISOString())} - {appointments.length} cuộc hẹn
                </span>
              </div>
            </div>

            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="text-gray-500">Đang tải danh sách lịch hẹn...</div>
              </div>
            ) : appointments.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <p className="text-gray-500">Không có lịch hẹn nào trong ngày hôm nay</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {paginatedAppointments.map((appointment) => {
                  // Tính số thứ tự cho lịch hẹn chờ khám
                  const isCheckedStatus = appointment.status === 'checked';
                  const orderNumber = isCheckedStatus 
                    ? appointments.filter(apt => apt.status === 'checked')
                        .findIndex(apt => apt._id === appointment._id) + 1
                    : null;
                  
                  return (
                  <Card key={appointment._id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            {isCheckedStatus && orderNumber && (
                              <div className="flex items-center justify-center w-8 h-8 bg-blue-600 text-white font-bold rounded-full">
                                {orderNumber}
                              </div>
                            )}
                            <h3 className="font-semibold text-lg">
                              {appointment.patient_id?.user_id?.full_name || 'Chưa có tên'}
                            </h3>
                            {getStatusBadge(appointment.status)}
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                            <div>
                              <span className="font-medium">Mã BN:</span> {appointment.patient_id?._id?.slice(-6) || 'N/A'}
                            </div>
                            <div>
                              <span className="font-medium">
                                {isCheckedStatus ? 'Thời gian chờ:' : 'Thời gian hẹn:'}
                              </span> {isCheckedStatus 
                                ? new Date(appointment.updatedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                                : formatTime(appointment.appointment_time)
                              }
                            </div>
                            <div>
                              <span className="font-medium">Triệu chứng:</span> {appointment.symptoms || 'Chưa có'}
                            </div>
                            <div>
                              <span className="font-medium">SĐT:</span> {appointment.patient_id?.user_id?.phone || 'Chưa có'}
                            </div>
                          </div>
                          {appointment.notes && (
                            <div className="mt-2 text-sm text-gray-600">
                              <span className="font-medium">Ghi chú:</span> {appointment.notes}
                            </div>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                              onClick={() => handleOpenMedicalRecordForm(appointment)}
                              disabled={appointment.status !== 'checked' || !isOnline}
                              className={appointment.status === 'checked' && isOnline ? 'bg-green-600 hover:bg-green-700' : ''}
                              title={
                                !isOnline 
                                  ? 'Bác sĩ đang offline. Vui lòng chuyển sang chế độ online để khám bệnh'
                                  : appointment.status !== 'checked' 
                                    ? 'Chỉ có thể khám khi trạng thái là "Chờ khám"' 
                                    : 'Khám bệnh'
                              }
                            >
                              {!isOnline 
                                ? '⚫ Offline' 
                                : appointment.status === 'checked' 
                                  ? '✓ Khám bệnh' 
                                  : '🔒 Khám bệnh'
                              }
                            </Button>
                          </div>
                      </div>
                    </CardContent>
                  </Card>
                  );
                })}
              </div>
            )}
            {!isLoading && appointments.length > itemsPerPage && (
              <div className="flex justify-center mt-6">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        href="#" 
                        onClick={(e) => {
                          e.preventDefault();
                          if (currentPage > 1) handlePageChange(currentPage - 1);
                        }}
                        className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                      />
                    </PaginationItem>
                    
                    {[...Array(totalPages)].map((_, index) => {
                      const page = index + 1;
                      return (
                        <PaginationItem key={page}>
                          <PaginationLink
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              handlePageChange(page);
                            }}
                            isActive={currentPage === page}
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}
                    
                    <PaginationItem>
                      <PaginationNext 
                        href="#" 
                        onClick={(e) => {
                          e.preventDefault();
                          if (currentPage < totalPages) handlePageChange(currentPage + 1);
                        }}
                        className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal form hồ sơ bệnh án */}
      {showMedicalRecordForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                Hồ sơ bệnh án mới {selectedAppointment?.patient_name || ''}
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMedicalRecordForm(false)}
              >
                ✕
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="symptoms">Triệu chứng</Label>
                <textarea
                  id="symptoms"
                  name="symptoms"
                  value={medicalRecordForm.symptoms}
                  onChange={handleMedicalRecordChange}
                  className="w-full mt-1 p-2 border border-gray-300 rounded-md"
                  rows="3"
                  placeholder="Mô tả triệu chứng của bệnh nhân..."
                />
              </div>

              <div>
                <Label htmlFor="diagnosis">Chẩn đoán</Label>
                <textarea
                  id="diagnosis"
                  name="diagnosis"
                  value={medicalRecordForm.diagnosis}
                  onChange={handleMedicalRecordChange}
                  className="w-full mt-1 p-2 border border-gray-300 rounded-md"
                  rows="3"
                  placeholder="Chẩn đoán bệnh..."
                />
              </div>

              <div>
                <Label htmlFor="treatment">Phương pháp điều trị</Label>
                <textarea
                  id="treatment"
                  name="treatment"
                  value={medicalRecordForm.treatment}
                  onChange={handleMedicalRecordChange}
                  className="w-full mt-1 p-2 border border-gray-300 rounded-md"
                  rows="3"
                  placeholder="Phương pháp điều trị..."
                />
              </div>

              <div>
                <Label htmlFor="follow_up">Khuyến nghị tái khám</Label>
                <Input
                  id="follow_up"
                  name="follow_up"
                  value={medicalRecordForm.follow_up}
                  onChange={handleMedicalRecordChange}
                  placeholder="Tái khám sau 1 tuần..."
                />
              </div>

              <div>
                <Label htmlFor="notes">Lời khuyên cho bệnh nhân</Label>
                <textarea
                  id="notes"
                  name="notes"
                  value={medicalRecordForm.notes}
                  onChange={handleMedicalRecordChange}
                  className="w-full mt-1 p-2 border border-gray-300 rounded-md"
                  rows="2"
                  placeholder="Ghi chú thêm..."
                />
              </div>

              {/* Kê đơn thuốc */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-3">
                  <Label className="text-base font-semibold">Kê đơn thuốc</Label>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleAddMedicalRecordMedication}
                  >
                    + Thêm thuốc
                  </Button>
                </div>
                
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {medicalRecordForm.medications.map((medication, index) => (
                    <div key={index} className="border rounded-lg p-3 space-y-2 bg-gray-50">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">Thuốc #{index + 1}</span>
                        {medicalRecordForm.medications.length > 1 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRemoveMedicalRecordMedication(index)}
                            className="h-6 w-6 p-0"
                          >
                            ✕
                          </Button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div className="col-span-2">
                          <Label className="text-xs">Tìm kiếm thuốc</Label>
                          <Input
                            value={medication.searchTerm || ''}
                            onChange={e => handleMedicalRecordMedicationChange(index, 'searchTerm', e.target.value)}
                            placeholder="Nhập tên thuốc..."
                            className="w-full mt-1 mb-2 p-1.5 text-sm border border-gray-300 rounded-md"
                          />
                          <Label className="text-xs">Chọn thuốc</Label>
                          <select
                            value={medication.medicine_id}
                            onChange={(e) => handleSelectMedicineForMedicalRecord(index, e.target.value)}
                            className="w-full mt-1 p-1.5 text-sm border border-gray-300 rounded-md"
                          >
                            <option value="">-- Chọn thuốc --</option>
                            {getFilteredMedicines(medication.searchTerm).map(med => {
                              const expiryDate = med.expiry_date 
                                ? new Date(med.expiry_date).toLocaleDateString('vi-VN')
                                : 'Chưa có';
                              return (
                                <option key={med._id} value={med._id}>
                                  {med.drug_name || med.medicine_name} ({med.stock_quantity} {med.unit}) - HSD: {expiryDate}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                        
                        <div>
                          <Label className="text-xs">Liều lượng</Label>
                          <Input
                            value={medication.dosage}
                            onChange={(e) => handleMedicalRecordMedicationChange(index, 'dosage', e.target.value)}
                            placeholder="VD: 1 viên"
                            className="h-8 text-sm"
                          />
                        </div>
                        
                        <div>
                          <Label className="text-xs">Tần suất</Label>
                          <Input
                            value={medication.frequency}
                            onChange={(e) => handleMedicalRecordMedicationChange(index, 'frequency', e.target.value)}
                            placeholder="VD: 2 lần/ngày"
                            className="h-8 text-sm"
                          />
                        </div>
                        
                        <div>
                          <Label className="text-xs">Thời gian</Label>
                          <Input
                            value={medication.duration}
                            onChange={(e) => handleMedicalRecordMedicationChange(index, 'duration', e.target.value)}
                            placeholder="VD: 7 ngày"
                            className="h-8 text-sm"
                          />
                        </div>
                        
                        <div>
                          <Label className="text-xs">Số lượng (Tồn: {medication.stock_quantity})</Label>
                          <Input
                            type="number"
                            value={medication.quantity}
                            onChange={(e) => handleMedicalRecordMedicationChange(index, 'quantity', e.target.value)}
                            placeholder="Số lượng"
                            max={medication.stock_quantity}
                            className="h-8 text-sm"
                          />
                        </div>
                        
                        <div className="col-span-2">
                          <Label className="text-xs">Hướng dẫn sử dụng</Label>
                          <Input
                            value={medication.instructions}
                            onChange={(e) => handleMedicalRecordMedicationChange(index, 'instructions', e.target.value)}
                            placeholder="VD: Uống sau bữa ăn"
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Button variant="outline" onClick={() => setShowMedicalRecordForm(false)}>
                  Hủy
                </Button>
                <Button 
                  onClick={handleSaveMedicalRecord}
                  disabled={!isOnline}
                  className={!isOnline ? 'opacity-50 cursor-not-allowed' : 'text-white bg-blue-600 hover:bg-blue-700'}
                  title={!isOnline ? 'Bác sĩ đang offline. Vui lòng chuyển sang chế độ online để lưu hồ sơ' : 'Lưu hồ sơ và đơn thuốc'}
                >
                  {!isOnline ? '⚫ Offline - Không thể lưu' : 'Lưu hồ sơ và đơn thuốc'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default HomepageDoctor;
