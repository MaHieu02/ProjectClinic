import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { getCurrentUserFromStorage } from "@/utils/auth";
import { getAppointmentsByDate, updateAppointmentStatus } from "@/services/appointmentService";
import { searchPatients } from "@/services/patientService";
import { getReceptionistStats } from "@/services/statsService";
import { getMedicalRecordByAppointment, dispensePrescription } from "@/services/medicalRecordService";
import { getActiveExaminationFees } from "@/services/examinationFeeService";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import logo from '@/assets/logo.png';

// Hàm trợ giúp định dạng ngày
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

const HomepageReceptionist = () => {
  const navigate = useNavigate();
  const [searchPatient, setSearchPatient] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [statistics, setStatistics] = useState({
    totalPatientsToday: 0,
    completedAppointments: 0,
    waitingAppointments: 0,
    inProgressAppointments: 0,
    lowStockMedicines: 0,
    activeDoctors: 0,
    totalDoctors: 0,
    totalMedicines: 0
  });
  const [error, setError] = useState(null);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [loadingPrescription, setLoadingPrescription] = useState(false);
  const [dispensing, setDispensing] = useState(false);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [selectedAppointmentForCheckIn, setSelectedAppointmentForCheckIn] = useState(null);
  const [examinationFees, setExaminationFees] = useState([]);
  const [selectedExaminationFee, setSelectedExaminationFee] = useState(null);
  
  const itemsPerPage = 10;

  // Tạo chuỗi ngày local YYYY-MM-DD
  const getLocalDateString = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Tự động huỷ lịch trễ hẹn
  const autoCancelLateAppointments = useCallback(async (appointments) => {
    const lateAppointments = appointments.filter(apt => apt.status === 'late');
    
    for (const apt of lateAppointments) {
      try {
        await updateAppointmentStatus(apt._id, 'cancelled', {
          notes: 'Huỷ lịch tự động do khách hàng không tới'
        });
        console.log(`Đã tự động huỷ lịch hẹn ${apt._id}`);
      } catch (error) {
        console.error(`Lỗi khi huỷ lịch hẹn ${apt._id}:`, error);
      }
    }
  
    if (lateAppointments.length > 0) {
      setTimeout(async () => {
        const today = getLocalDateString();
        const response = await getAppointmentsByDate(today);
        if (response.success) {
          setTodayAppointments(response.data || []);
        }
      }, 1000);
    }
  }, []);

  // Tải danh sách lịch hẹn hôm nay từ API
  const loadTodayAppointments = useCallback(async () => {
    try {
      const today = getLocalDateString();
      console.log("Loading appointments for date:", today);
      
      const result = await getAppointmentsByDate(today);
      
      console.log("loadTodayAppointments result:", result);
      console.log("appointments data:", result.data);
      
      if (result.success) {
        const appointments = result.data || [];
        setTodayAppointments(appointments);
        setError(null);
      
        await autoCancelLateAppointments(appointments);
      } else {
        console.error("Failed to load appointments:", result.error);
        const errorMsg = result.error || "Không thể tải danh sách lịch hẹn";
        setError(`Lỗi tải lịch hẹn: ${errorMsg}`);
      }
    } catch (error) {
      console.error("Error loading appointments:", error);
      setError(`Lỗi khi tải dữ liệu lịch hẹn: ${error.message}`);
    }
  }, [autoCancelLateAppointments]);

  // Tải các số liệu thống kê từ API
  const loadStatistics = async () => {
    try {
      const result = await getReceptionistStats();
      
      if (result.success && result.data) {
        setStatistics(result.data);
      } else {
        console.error("Failed to load statistics:", result.error);
      }
    } catch (error) {
      console.error("Error loading statistics:", error);
    }
  };

  // Tải danh sách giá khám
  const loadExaminationFees = async () => {
    try {
      const result = await getActiveExaminationFees();
      if (result.success && result.data) {
        setExaminationFees(result.data);
      }
    } catch (error) {
      console.error('Lỗi khi tải giá khám:', error);
    }
  };

  // Xử lý tìm kiếm bệnh nhân
  const handlePatientSearch = async () => {
    if (!searchPatient.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const result = await searchPatients(searchPatient.trim());
      
      if (result.success) {
        setSearchResults(result.data || []);
      } else {
        console.error("Search failed:", result.error);
        setError("Không thể tìm kiếm bệnh nhân");
        setSearchResults([]);
      }
    } catch (error) {
      console.error("Error searching patients:", error);
      setError("Lỗi khi tìm kiếm bệnh nhân");
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };


  // Cập nhật trạng thái lịch hẹn
  const handleUpdateAppointmentStatus = async (appointmentId, newStatus) => {

    if (newStatus === 'checked') {
      const appointment = todayAppointments.find(apt => apt._id === appointmentId);
      if (appointment) {
        setSelectedAppointmentForCheckIn(appointment);
      
        const specialtyId = appointment.doctor_id?.specialty_id?._id;
        const matchingFee = examinationFees.find(fee => 
          fee.specialty_id === specialtyId || fee.specialty_id === null
        );
        
        setSelectedExaminationFee(matchingFee || examinationFees[0]);
        setShowCheckInModal(true);
        return;
      }
    }

    try {
      const result = await updateAppointmentStatus(appointmentId, newStatus);
      
      if (result.success) {
        await loadTodayAppointments();
        await loadStatistics();
        
        const statusText = getStatusText(newStatus);
        alert(`Đã chuyển trạng thái thành: ${statusText}`);
      } else {
        console.error("Failed to update status:", result.error);
        alert("Không thể cập nhật trạng thái: " + (result.error || 'Lỗi không xác định'));
      }
    } catch (error) {
      console.error("Error updating appointment status:", error);
      alert("Lỗi khi cập nhật trạng thái: " + error.message);
    }
  };

  // Xác nhận check-in và cập nhật trạng thái
  const handleConfirmCheckIn = async () => {
    if (!selectedAppointmentForCheckIn || !selectedExaminationFee) return;

    try {
      const result = await updateAppointmentStatus(
        selectedAppointmentForCheckIn._id, 
        'checked',
        {
          examination_fee_id: selectedExaminationFee._id
        }
      );
      
      if (result.success) {
        await loadTodayAppointments();
        await loadStatistics();
        setShowCheckInModal(false);
        setSelectedAppointmentForCheckIn(null);
        alert('Đã chuyển bệnh nhân vào trạng thái chờ khám');
      } else {
        console.error("Failed to check in:", result.error);
        alert("Không thể check-in: " + (result.error || 'Lỗi không xác định'));
      }
    } catch (error) {
      console.error("Error during check-in:", error);
      alert("Lỗi khi check-in: " + error.message);
    }
  };

  // Xem chi tiết đơn thuốc
  const handleViewPrescription = async (appointmentId) => {
    setLoadingPrescription(true);
    setShowPrescriptionModal(true);
    setSelectedPrescription(null);
    
    try {
      const result = await getMedicalRecordByAppointment(appointmentId);
      
      if (result.success && result.data) {
        setSelectedPrescription(result.data);
      } else {
        alert(result.error || 'Không tìm thấy đơn thuốc cho lịch hẹn này');
        setShowPrescriptionModal(false);
      }
    } catch (error) {
      console.error("Error loading prescription:", error);
      alert("Lỗi khi tải đơn thuốc: " + error.message);
      setShowPrescriptionModal(false);
    } finally {
      setLoadingPrescription(false);
    }
  };

  // In đơn thuốc và xuất kho
  const handleDispensePrescription = async () => {
    if (!selectedPrescription) return;

    if (!window.confirm('Xác nhận in đơn thuốc? Số lượng thuốc trong kho sẽ được giảm tương ứng.')) {
      return;
    }

    setDispensing(true);
    try {
      const result = await dispensePrescription(selectedPrescription._id);
      
      if (result.success) {
        alert('In đơn thuốc và xuất kho thành công!');
        setSelectedPrescription(result.data);
        await loadStatistics();
      } else {
        alert(result.error || 'Không thể in đơn thuốc');
      }
    } catch (error) {
      console.error("Error dispensing prescription:", error);
      alert("Lỗi khi in đơn thuốc: " + error.message);
    } finally {
      setDispensing(false);
    }
  };

  // Tải tất cả dữ liệu khi component được mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);

      // Kiểm tra quyền truy cập
      const user = getCurrentUserFromStorage();
      console.log("Current user from storage:", user);
      
      if (!user) {
        setError("Chưa đăng nhập. Vui lòng đăng nhập lại.");
        setIsLoading(false);
        setTimeout(() => {
          navigate('/login');
        }, 2000);
        return;
      }
      
      if (user.role !== 'receptionist') {
        setError(`Bạn không có quyền truy cập trang này. Role hiện tại: ${user.role}`);
        setIsLoading(false);
        switch (user.role) {
          case 'patient':
            setTimeout(() => navigate('/'), 2000);
            break;
          case 'doctor':
            setTimeout(() => navigate('/doctor'), 2000);
            break;
          default:
            setTimeout(() => navigate('/login'), 2000);
        }
        return;
      }

      await Promise.all([
        loadTodayAppointments(),
        loadStatistics(),
        loadExaminationFees()
      ]);

      setIsLoading(false);
    };

    loadData();
  }, [navigate, loadTodayAppointments]); 

  // Tự động làm mới lịch hẹn và thống kê mỗi 30 giây
  useAutoRefresh(async () => {
    await loadTodayAppointments();
    await loadStatistics();
  }, [], 30000);
  
  // Xử lý thay đổi input tìm kiếm với debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchPatient.trim()) {
        const performSearch = async () => {
          setIsSearching(true);
          try {
            const result = await searchPatients(searchPatient.trim());
            
            if (result.success) {
              setSearchResults(result.data || []);
            } else {
              console.error("Search failed:", result.error);
              setError("Không thể tìm kiếm bệnh nhân");
              setSearchResults([]);
            }
          } catch (error) {
            console.error("Error searching patients:", error);
            setError("Lỗi khi tìm kiếm bệnh nhân");
            setSearchResults([]);
          } finally {
            setIsSearching(false);
          }
        };
        
        performSearch();
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchPatient]);

  // Lấy màu sắc theo trạng thái lịch hẹn
  const getStatusColor = (status) => {
    switch (status) {
      case 'booked': return 'bg-yellow-100 text-yellow-800';
      case 'checked': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'late': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Lấy văn bản theo trạng thái lịch hẹn
  const getStatusText = (status) => {
    switch (status) {
      case 'booked': return 'Đặt lịch';
      case 'checked': return 'Chờ khám';
      case 'completed': return 'Hoàn thành';
      case 'cancelled': return 'Đã hủy';
      case 'late': return 'Trễ hẹn';
      default: return 'Không xác định';
    }
  };

  // Xử lý phân trang
  const totalPages = Math.ceil(todayAppointments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedAppointments = todayAppointments.slice(startIndex, startIndex + itemsPerPage);

  // Thay đổi trang
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  return (
    <div className="min-h-screen w-full bg-white relative overflow-hidden">
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `
            radial-gradient(circle 600px at 0% 200px, #bfdbfe, transparent),
            radial-gradient(circle 600px at 100% 200px, #bfdbfe, transparent)
          `,
        }}
      />
      
      <header className="bg-white shadow-sm border-b border-gray-200 relative z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <img 
                src={logo} 
                alt="Logo Phòng khám" 
                className="h-12 w-12 object-contain rounded-full"
              />
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Trang chủ Lễ tân</h1>
                <p className="text-gray-600">Quản lý lịch hẹn và bệnh nhân</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="px-3 py-1">
                Hôm nay: {new Date().toLocaleDateString('vi-VN')}
              </Badge>
              <Button variant="outline" size="sm" onClick={() => window.location.href = '/setting'}>
                Cài đặt
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Cột trái - Thao tác nhanh */}
          <div className="lg:col-span-1">
            <Card className="mb-6 border-2 border-gray-300">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">
                  Thao tác nhanh
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white 
                transition-all duration-200"
                onClick={() => window.location.href = '/registerstaff'}
                >
                  Thêm bệnh nhân mới
                </Button>
                <Button variant="outline" className="w-full border-blue-300 text-black-700 hover:bg-blue-50 
                transition-all duration-200"
                onClick={() => window.location.href = '/drugwarehouse'}
                >
                  Kho thuốc
                </Button>
              </CardContent>
            </Card>

            {/* Tìm kiếm bệnh nhân */}
            <Card className="mb-6 border-2 border-gray-300">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">
                  Tìm kiếm bệnh nhân
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="relative">
                    <Input
                      placeholder="Nhập tên hoặc số điện thoại..."
                      value={searchPatient}
                      onChange={(e) => setSearchPatient(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handlePatientSearch();
                        }
                      }}
                      className="pr-10"
                    />
                    {isSearching && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                      </div>
                    )}
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full bg-green-400 hover:bg-green-500 text-black hover:bg-green-50 hover:text-green-700 hover:border-green-300"
                    onClick={handlePatientSearch}
                    disabled={isSearching || !searchPatient.trim()}
                  >
                    {isSearching ? "Đang tìm kiếm..." : "Tìm kiếm"}
                  </Button>
                </div>
                
                {/* Kết quả tìm kiếm bệnh nhân */}
                {searchResults.length > 0 && (
                  <div className="mt-4 max-h-60 overflow-y-auto">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Kết quả tìm kiếm:</h4>
                    {searchResults.map((patient) => (
                      <div 
                        key={patient._id} 
                        className="p-3 border rounded mb-2 hover:bg-blue-50 hover:border-blue-300 cursor-pointer transition-all duration-200 hover:shadow-md"
                        onClick={() => {
                          // Chuyển đến trang hồ sơ bệnh nhân
                          if (patient.user_id?._id) {
                            navigate(`/patient/${patient.user_id._id}`);
                          } else {
                            alert('Không thể xem thông tin bệnh nhân này');
                          }
                        }}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="font-medium text-sm text-gray-800">
                              {patient.user_id?.full_name || 'Chưa có tên'}
                            </div>
                            <div className="text-xs text-gray-600">
                              SĐT: {patient.user_id?.phone || 'Chưa có SĐT'}
                            </div>
                            {patient.user_id?.dob && (
                              <div className="text-xs text-gray-600">
                                Ngày sinh: {formatDate(patient.user_id.dob)}
                              </div>
                            )}
                            {patient.user_id?.gender && (
                              <div className="text-xs text-gray-600">
                                Giới tính: {patient.user_id.gender === 'male' ? 'Nam' : patient.user_id.gender === 'female' ? 'Nữ' : 'Khác'}
                              </div>
                            )}
                            {patient.user_id?.address && (
                              <div className="text-xs text-gray-500 mt-1">
                                Địa chỉ: {patient.user_id.address}
                              </div>
                            )}
                          </div>
                          <div className="text-blue-500 text-xs ml-2">
                            <span className="hover:underline">Xem →</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {isSearching && searchPatient.trim() && (
                  <div className="mt-4 text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-2"></div>
                    <p className="text-sm text-gray-500">Đang tìm kiếm...</p>
                  </div>
                )}
                
                {searchPatient.trim() && searchResults.length === 0 && !isSearching && (
                  <div className="mt-4 text-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    <p className="text-sm text-gray-600 font-medium">Không tìm thấy bệnh nhân</p>
                    <p className="text-xs text-gray-500 mt-1">Thử tìm kiếm với từ khóa khác</p>
                  </div>
                )}
              </CardContent>
            </Card>


            <Card className="border-2 border-gray-300">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">
                  Thống kê nhanh
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-gradient-to-r from-orange-50 to-pink-50 rounded-lg border border-orange-100">
                  <span className="text-sm text-gray-700 font-medium">Bệnh nhân hôm nay:</span>
                  <Badge className="bg-orange-100 text-orange-800 font-semibold">
                    {isLoading ? "..." : statistics.totalPatientsToday}
                  </Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-gradient-to-r from-red-50 to-orange-50 rounded-lg border border-red-100">
                  <span className="text-sm text-gray-700 font-medium">Thuốc sắp hết:</span>
                  <Badge className="bg-red-100 text-red-800 font-semibold">
                    {isLoading ? "..." : statistics.lowStockMedicines}
                  </Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-lg border border-teal-100">
                  <span className="text-sm text-gray-700 font-medium">Bác sĩ đang làm:</span>
                  <Badge className="bg-teal-100 text-teal-800 font-semibold">
                    {isLoading ? "..." : `${statistics.activeDoctors}/${statistics.totalDoctors}`}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-2">
            <Card className="border-2 border-gray-300">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    Lịch hẹn hôm nay ({todayAppointments.length})
                  </span>
                  <Button 
                    className="hover:bg-gray-300"
                    onClick={loadTodayAppointments}
                    variant="outline"
                    size="sm"
                  >
                    🔄 Làm mới
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {error && (
                  <div className="mb-4 p-4 bg-red-50 border-2 border-red-300 rounded-lg">
                    <div className="flex items-start">
                      <div className="ml-3 flex-1">
                        <h3 className="text-sm font-semibold text-red-800 mb-1">
                          Lỗi tải dữ liệu
                        </h3>
                        <div className="text-sm text-red-700">{error}</div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="mt-3 text-red-700 border-red-300 hover:bg-red-100"
                          onClick={() => {
                            setError(null);
                            loadTodayAppointments();
                          }}
                        >
                          Thử lại
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
                
                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <div className="text-gray-500">Đang tải dữ liệu...</div>
                  </div>
                ) : todayAppointments.length === 0 && !error ? (
                  <div className="text-center py-8">
                    <div className="text-gray-500">Không có lịch hẹn nào hôm nay</div>
                  </div>
                ) : !error ? (
                  <div className="space-y-4">
                    {paginatedAppointments.map((appointment) => (
                      <div
                        key={appointment._id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-200 hover:shadow-md transition-all duration-300 cursor-pointer"
                      >
                        <div className="flex items-center gap-4">
                          <div className="text-lg font-mono font-semibold text-gray-700 min-w-[60px]">
                            {new Date(appointment.appointment_time).toLocaleTimeString('vi-VN', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-800">
                              {appointment.patient_id?.user_id?.full_name || "Chưa có tên"}
                            </p>
                            <p className="text-sm text-gray-600">
                              BS. {appointment.doctor_id?.user_id?.full_name || "Chưa phân công"}
                            </p>
                            <p className="text-xs text-gray-500">
                              Chuyên khoa: {appointment.doctor_id?.specialty_id?.name || 'Chưa xác định'}
                            </p>
                            {appointment.examination_fee_id && (
                              <p className="text-xs text-blue-600 font-medium">
                                Loại dịch vụ: {appointment.examination_fee_id.examination_type}
                              </p>
                            )}
                            {appointment.symptoms && (
                              <p className="text-xs text-gray-500">
                                Triệu chứng: {appointment.symptoms}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className={`${getStatusColor(appointment.status)} border-0`}>
                            {getStatusText(appointment.status)}
                          </Badge>
                          
                          {appointment.status === 'booked' && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="border-green-500 text-green-700 hover:bg-green-50"
                              onClick={() => handleUpdateAppointmentStatus(appointment._id, 'checked')}
                            >
                              Chờ khám
                            </Button>
                          )}
                          
                          {appointment.status === 'completed' && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="border-blue-500 text-blue-700 hover:bg-blue-50"
                              onClick={() => handleViewPrescription(appointment._id)}
                            >
                              Xem đơn thuốc
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}

                    {todayAppointments.length > itemsPerPage && (
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
                ) : null}
              </CardContent>
            </Card>

            {/* Các thẻ thống kê */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
              <Card className="text-center transition-shadow hover:shadow-lg bg-gradient-to-br from-orange-50 to-pink-50 border-2 border-orange-300">
                <CardContent className="pt-6">
                  <div className="text-3xl font-bold text-orange-600">
                    {isLoading ? "..." : statistics.totalPatientsToday}
                  </div>
                  <p className="text-sm text-gray-700 font-medium mt-2">Lịch hẹn hôm nay</p>
                </CardContent>
              </Card>
              <Card className="text-center transition-shadow hover:shadow-lg bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-300">
                <CardContent className="pt-6">
                  <div className="text-3xl font-bold text-emerald-600">
                    {isLoading ? "..." : statistics.completedAppointments}
                  </div>
                  <p className="text-sm text-gray-700 font-medium mt-2">Đã hoàn thành</p>
                </CardContent>
              </Card>
              <Card className="text-center transition-shadow hover:shadow-lg bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-amber-300">
                <CardContent className="pt-6">
                  <div className="text-3xl font-bold text-amber-600">
                    {isLoading ? "..." : statistics.waitingAppointments}
                  </div>
                  <p className="text-sm text-gray-700 font-medium mt-2">Chờ khám</p>
                </CardContent>
              </Card>
              <Card className="text-center transition-shadow hover:shadow-lg bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-300">
                <CardContent className="pt-6">
                  <div className="text-3xl font-bold text-purple-600">
                    {isLoading ? "..." : statistics.totalMedicines}
                  </div>
                  <p className="text-sm text-gray-700 font-medium mt-2">Thuốc trong kho</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      {/* Modal đơn thuốc */}
      {showPrescriptionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6 border-b pb-4">
                <h2 className="text-2xl font-semibold text-gray-800">
                  Chi Tiết Đơn Thuốc
                </h2>
                <button
                  onClick={() => setShowPrescriptionModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                >
                  ×
                </button>
              </div>

              {loadingPrescription ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Đang tải đơn thuốc...</p>
                </div>
              ) : selectedPrescription ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                    <div>
                      <h3 className="font-semibold text-gray-700 mb-2">Thông tin bệnh nhân:</h3>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Tên:</span>{' '}
                        {selectedPrescription.patient_id?.user_id?.full_name || 'Chưa có'}
                      </p>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">SĐT:</span>{' '}
                        {selectedPrescription.patient_id?.user_id?.phone || 'Chưa có'}
                      </p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-700 mb-2">Bác sĩ điều trị:</h3>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">BS.</span>{' '}
                        {selectedPrescription.doctor_id?.user_id?.full_name || 'Chưa có'}
                      </p>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Ngày khám:</span>{' '}
                        {formatDate(selectedPrescription.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-gray-700 mb-2">Chẩn đoán:</h3>
                    <p className="text-gray-800">{selectedPrescription.diagnosis}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-gray-700 mb-2">Phương pháp điều trị:</h3>
                    <p className="text-gray-800">{selectedPrescription.treatment}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-700 mb-3">Đơn thuốc:</h3>
                    {selectedPrescription.medications_prescribed?.length > 0 ? (
                      <div className="space-y-3">
                        {selectedPrescription.medications_prescribed.map((med, index) => (
                          <div key={index} className="border border-gray-200 p-4 rounded-lg hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex-1">
                                <h4 className="font-semibold text-lg text-gray-800">
                                  {index + 1}. {med.medicine_name}
                                </h4>
                                <div className="grid grid-cols-2 gap-2 mt-2 text-sm text-gray-600">
                                  <p>
                                    <span className="font-medium">Số lượng:</span>{' '}
                                    <span className="text-blue-600 font-semibold">{med.quantity}</span>
                                  </p>
                                  <p>
                                    <span className="font-medium">Liều dùng:</span> {med.dosage}
                                  </p>
                                  <p>
                                    <span className="font-medium">Tần suất:</span> {med.frequency}
                                  </p>
                                  <p>
                                    <span className="font-medium">Thời gian:</span> {med.duration}
                                  </p>
                                </div>
                                {med.instructions && (
                                  <p className="mt-2 text-sm text-gray-600">
                                    <span className="font-medium">Hướng dẫn:</span> {med.instructions}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-4">Không có thuốc được kê đơn</p>
                    )}
                  </div>
                  {selectedPrescription.follow_up_recommendations && (
                    <div className="bg-yellow-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-gray-700 mb-2">Khuyến nghị tái khám:</h3>
                      <p className="text-gray-800">{selectedPrescription.follow_up_recommendations}</p>
                    </div>
                  )}
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="flex justify-between items-center">
                      <h3 className="font-semibold text-gray-700">Tổng chi phí:</h3>
                      <p className="text-2xl font-bold text-purple-600">
                        {selectedPrescription.total_cost?.toLocaleString('vi-VN')} VNĐ
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <Badge className={
                        selectedPrescription.status === 'dispensed' 
                          ? 'bg-green-100 text-green-800 text-base px-4 py-2'
                          : 'bg-yellow-100 text-yellow-800 text-base px-4 py-2'
                      }>
                        {selectedPrescription.status === 'dispensed' ? 'Đã xuất kho' : 'Chưa xuất kho'}
                      </Badge>
                    </div>
                    {selectedPrescription.status !== 'dispensed' && (
                      <Button
                        onClick={handleDispensePrescription}
                        disabled={dispensing}
                        className="bg-green-600 hover:bg-green-700 text-white px-6 py-2"
                      >
                        {dispensing ? 'Đang xử lý...' : 'In đơn thuốc và xuất kho'}
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500">Không thể tải đơn thuốc</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal xác nhận check-in với giá khám */}
      {showCheckInModal && selectedAppointmentForCheckIn && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6 border-b pb-4">
                <h2 className="text-2xl font-semibold text-gray-800">
                  Xác nhận Check-in
                </h2>
                <button
                  onClick={() => {
                    setShowCheckInModal(false);
                    setSelectedAppointmentForCheckIn(null);
                  }}
                  className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-700 mb-2">Thông tin bệnh nhân:</h3>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Tên:</span>{' '}
                    {selectedAppointmentForCheckIn.patient_id?.user_id?.full_name || 'Chưa có'}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Bác sĩ:</span>{' '}
                    BS. {selectedAppointmentForCheckIn.doctor_id?.user_id?.full_name || 'Chưa có'}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Chuyên khoa:</span>{' '}
                    {selectedAppointmentForCheckIn.doctor_id?.specialty_id?.name || 'Chưa xác định'}
                  </p>
                </div>
                {selectedExaminationFee && (
                  <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium text-gray-700">Phí khám:</p>
                        <p className="text-xs text-gray-600">{selectedExaminationFee.examination_type}</p>
                        {selectedExaminationFee.description && (
                          <p className="text-xs text-gray-500 mt-1">{selectedExaminationFee.description}</p>
                        )}
                      </div>
                      <p className="text-2xl font-bold text-green-600">
                        {selectedExaminationFee.fee.toLocaleString('vi-VN')} VNĐ
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCheckInModal(false);
                      setSelectedAppointmentForCheckIn(null);
                    }}
                  >
                    Hủy
                  </Button>
                  <Button
                    onClick={handleConfirmCheckIn}
                    disabled={!selectedExaminationFee}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    Xác nhận Check-in
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomepageReceptionist;