import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { getCurrentUserFromStorage } from '@/utils/auth';
import { cancelAppointment as cancelAppointmentApi } from '@/services/appointmentService';
import { getPatientByUserId, getPatientAppointments } from '@/services/patientService';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import doctorImage from '@/assets/homepage_doctor.png';
import logo from '@/assets/logo.png';

const HomepagePatient = () => {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(false);
  const [appointmentsError, setAppointmentsError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Kiểm tra quyền truy cập của người dùng
  useEffect(() => {
    const user = getCurrentUserFromStorage();
    
    if (!user) {
      navigate('/login');
    } else if (user.role !== 'patient') {
      switch (user.role) {
        case 'doctor':
          navigate('/doctor');
          break;
        case 'receptionist':
          navigate('/receptionist');
          break;
        default:
          navigate('/login');
      }
    }
  }, [navigate]);

  // Tải danh sách tất cả lịch hẹn của bệnh nhân hiện tại
  const loadMyAppointments = useCallback(async () => {
    try {
      setIsLoadingAppointments(true);
      setAppointmentsError('');
      const user = getCurrentUserFromStorage();
      const userId = user?.id || user?._id;
      if (!userId) return;

      const patientRes = await getPatientByUserId(userId);
      const patientId = patientRes?.data?._id;
      if (!patientRes.success || !patientId) {
        setAppointments([]);
        return;
      }

      const apptRes = await getPatientAppointments(patientId);
      if (apptRes.success) {
        const appointmentsData = Array.isArray(apptRes.data) ? apptRes.data : (apptRes.data?.appointments || []);
        console.log('Appointments data:', appointmentsData);
        console.log('First appointment doctor:', appointmentsData[0]?.doctor_id);
        setAppointments(appointmentsData);
      } else {
        setAppointments([]);
        setAppointmentsError(apptRes.error || 'Không thể tải lịch hẹn');
      }
    } catch (e) {
      setAppointmentsError(e?.message || 'Lỗi khi tải lịch hẹn');
      setAppointments([]);
    } finally {
      setIsLoadingAppointments(false);
    }
  }, []);

  // Tải danh sách lịch hẹn khi component được mount
  useEffect(() => {
    loadMyAppointments();
  }, [loadMyAppointments]);

  // Tự động làm mới danh sách lịch hẹn mỗi 30 giây
  useAutoRefresh(loadMyAppointments, [], 30000);

  // Xử lý đặt lịch hẹn
  const handleBookAppointment = () => {
    navigate('/appointmentHome');
  };

  // Xử lý xem lịch sử khám bệnh (đi đến hồ sơ bệnh nhân hiện tại)
  const handleViewMedicalHistory = () => {
    const user = getCurrentUserFromStorage();
    const userId = user?.id || user?._id;
    if (!user || !userId) {
      navigate('/login');
      return;
    }
    navigate(`/patient/${userId}`);
  };

  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('vi-VN');
  const formatTime = (dateString) => new Date(dateString).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const statusText = (s) => ({ booked: 'Đặt lịch', checked: 'Chờ khám', completed: 'Hoàn thành', cancelled: 'Đã hủy', late: 'Trễ hẹn' }[s] || 'Không xác định');
  const statusBadgeClass = (s) => ({ booked: 'bg-yellow-100 text-yellow-800', checked: 'bg-blue-100 text-blue-800', completed: 'bg-green-100 text-green-800', 
    cancelled: 'bg-red-100 text-red-800', late: 'bg-orange-100 text-orange-800' }[s] || 'bg-gray-100 text-gray-800');

  const canCancelByPatient = (appt) => {
    if (!appt || appt.status !== 'booked') return false;
    const now = new Date();
    const apptTime = new Date(appt.appointment_time);
    const diffMs = apptTime.getTime() - now.getTime();
    return diffMs >= 12 * 60 * 60 * 1000; // >= 12h
  };

  // Phân trang
  const itemsPerPage = 10;
  const totalPages = Math.ceil(appointments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentAppointments = appointments.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Xử lý hủy lịch hẹn
  const handleCancelAppointment = async (appt) => {
    if (!appt?._id) return;
    if (!canCancelByPatient(appt)) {
      alert('Bạn chỉ có thể hủy lịch hẹn trước thời gian khám ít nhất 12 giờ.');
      return;
    }
    const ok = window.confirm('Bạn có chắc muốn hủy lịch hẹn này?');
    if (!ok) return;
    const reason = window.prompt('Lý do hủy (tuỳ chọn):', '') || '';
    try {
      const res = await cancelAppointmentApi(appt._id, reason);
      if (res.success) {
        alert('Đã hủy lịch hẹn thành công.');
        loadMyAppointments();
      } else {
        alert(res.error || 'Không thể hủy lịch hẹn.');
      }
    } catch (e) {
      alert(e?.message || 'Lỗi khi hủy lịch hẹn.');
    }
  };

  return (
    <div className="min-h-screen w-full bg-white relative overflow-hidden flex flex-col">
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `
            radial-gradient(circle 600px at 0% 200px, #bfdbfe, transparent),
            radial-gradient(circle 600px at 100% 200px, #bfdbfe, transparent)
          `,
        }}
      />

      <header className="bg-white shadow-md py-4 px-6 relative z-10">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img 
              src={logo} 
              alt="Logo Phòng khám" 
              className="h-12 w-12 object-contain rounded-full"
            />
            <div className="text-2xl font-bold text-blue-600">
              Clinic
            </div>
          </div>
          
          <div className="text-xl font-semibold text-gray-700">
            Welcome
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-800">
              Số 5 Đường Láng Hạ,
              <br /> Quận Đống Đa, Hà Nội
            </div>
            
            <Button 
              variant="outline" 
              size="sm"
              className="p-2 hover:bg-gray-100 border-gray-300"
              onClick={() => window.location.href = '/setting'}
              title="Cài đặt"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 
                0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724
                 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 
                 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 
                 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-grow flex items-center min-h-[400px] relative z-10">
        <div className="max-w-7xl mx-auto px-6 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-stretch">
            <div className="order-1 lg:order-1 text-center lg:text-left">
              <div className="h-full min-h-[320px] flex flex-col justify-center">
                <h1 className="text-4xl lg:text-5xl font-bold text-black-800 mb-6">
                  Chăm sóc sức khỏe
                  <span className="block text-black-600">của bạn</span>
                </h1>
                <p className="text-lg text-gray-600 mb-8 max-w-md mx-auto lg:mx-0">
                  Đặt lịch khám với các bác sĩ chuyên nghiệp của chúng tôi. 
                  Dịch vụ y tế chất lượng cao, tận tâm với từng bệnh nhân.
                </p>
                <Button 
                  size="lg" 
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                  onClick={handleBookAppointment}
                >
                  Đặt lịch khám ngay
                </Button>
              </div>
            </div>

            <div className="order-2 lg:order-2">
              <div className="bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl p-8 shadow-lg h-full min-h-[320px]">
                <div className="bg-white rounded-xl p-6 h-full flex flex-col">
                  <img 
                    src={doctorImage} 
                    alt="Bác sĩ phòng khám" 
                    className="w-full flex-1 object-cover rounded-lg shadow-md"
                  />
                  <p className="text-gray-600 text-sm text-center mt-4 flex-shrink-0">Đội ngũ bác sĩ chuyên nghiệp</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-gradient-to-b from-white to-blue-50 border-t border-gray-200 py-16 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-800 mb-3">
              Tại Sao Chọn Chúng Tôi ?
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-md transition-shadow duration-300 border border-gray-100 text-center">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-3">
                Đội Ngũ Bác Sĩ Giàu Kinh Nghiệm
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Các bác sĩ của chúng tôi là các chuyên gia giàu kinh nghiệm được đào tạo tại các trường đại học y khoa hàng đầu.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md transition-shadow duration-300 border border-gray-100 text-center">
              <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-3">
                Dịch Vụ Chuyên Nghiệp
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Chúng tôi cam kết cung cấp dịch vụ chăm sóc chu đáo, chuyên nghiệp với phương châm lấy bệnh nhân làm trung tâm.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md transition-shadow duration-300 border border-gray-100 text-center">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-3">
                Trang Thiết Bị Hiện Đại
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Chúng tôi đầu tư vào thiết bị y tế hiện đại được nhập khẩu từ Châu Âu, Mỹ và Nhật Bản.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md transition-shadow duration-300 border border-gray-100 text-center">
              <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-3">
                Giá Cả Minh Bạch
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Giá cả của chúng tôi rõ ràng và hợp lý, không có chi phí ẩn hoặc thủ thuật không cần thiết.
              </p>
            </div>
          </div>

          <div className="text-center mt-12">
            <Button 
              size="lg" 
              className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-4 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
              onClick={handleBookAppointment}
            >
              Đặt lịch khám ngay
            </Button>
            <div className="mt-3">
                  <Button 
                    variant="outline"
                    size="lg"
                    className="px-8 py-4 text-lg rounded-xl border-blue-300 text-blue-700 hover:bg-blue-50"
                    onClick={handleViewMedicalHistory}
                  >
                    Xem lịch sử khám bệnh
                  </Button>
                </div>
          </div>
        </div>
      </footer>
      
      {/* Danh sách lịch hẹn của tôi */}
      <section className="bg-gradient-to-b from-white to-blue-50 border-t border-gray-200 py-12 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Lịch hẹn của tôi</h2>
            <Button className="hover:bg-gray-200" variant="outline" size="sm" onClick={loadMyAppointments}>🔄 Làm mới</Button>
          </div>

          {isLoadingAppointments ? (
            <div className="text-center py-8 text-gray-500">Đang tải lịch hẹn...</div>
          ) : appointmentsError ? (
            <div className="text-center py-8 text-red-600">{appointmentsError}</div>
          ) : appointments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Bạn chưa có lịch hẹn nào.</div>
          ) : (
            <>
              <div className="space-y-4">
                {currentAppointments.map((a) => (
                  <div key={a._id} className="border rounded-lg p-4 bg-white shadow-sm">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <div className={`px-2 py-0.5 text-xs rounded ${statusBadgeClass(a.status)}`}>{statusText(a.status)}</div>
                          <div className="text-sm text-gray-500">{formatDate(a.appointment_time)} • {formatTime(a.appointment_time)}</div>
                        </div>
                        <div className="text-gray-800 text-sm">
                          <span className="font-medium">Bác sĩ:</span> {a.doctor_id?.user_id?.full_name || 'Chưa có'}
                          {a.doctor_id?.specialty_id && (
                            <span className="ml-2 text-gray-500">
                              <strong>Chuyên khoa:</strong> {a.doctor_id.specialty_id.name}
                            </span>
                          )}
                          <br />
                          {a.examination_fee_id && (
                            <div className="mt-1">
                              <span className="font-medium">Dịch vụ khám:</span>{' '}
                              <span className="text-blue-600">{a.examination_fee_id.examination_type}</span>
                            </div>
                          )}
                        </div>
                        {a.notes && (
                          <div className="text-xs text-gray-600 mt-1">Ghi chú: {a.notes}</div>
                        )}
                      </div>
                      <div className="ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!canCancelByPatient(a)}
                          title={canCancelByPatient(a) ? 'Hủy lịch hẹn' : 'Chỉ có thể hủy trước thời gian khám ít nhất 12 giờ'}
                          className={
                            canCancelByPatient(a)
                              ? 'text-red-600 border-red-600 hover:bg-red-50'
                              : 'text-gray-400 border-gray-300 cursor-not-allowed opacity-50'
                          }
                          onClick={() => {
                            if (canCancelByPatient(a)) handleCancelAppointment(a);
                          }}
                        >
                          Hủy lịch
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Phân trang */}
              {totalPages > 1 && (
                <div className="mt-6">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                          className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                      
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <PaginationItem key={page}>
                          <PaginationLink
                            onClick={() => handlePageChange(page)}
                            isActive={currentPage === page}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      
                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                          className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
};

export default HomepagePatient;
