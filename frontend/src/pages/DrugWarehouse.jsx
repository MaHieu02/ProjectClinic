import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Pagination, 
    PaginationContent, 
    PaginationEllipsis, 
    PaginationItem, 
    PaginationLink, 
    PaginationNext, 
    PaginationPrevious } from "@/components/ui/pagination";
import {
  getMedicines,
  createMedicine,
  updateMedicine,
  deleteMedicine,
  getMedicineStats,
  updateMedicineStock
} from '../services/medicineService.js';
import { getActiveSuppliers } from '../services/supplierService.js';
import { getUserRole } from '@/utils/auth.js';

const DrugWarehouse = () => {
  const navigate = useNavigate();
  const role = getUserRole();
  const isReceptionist = role === 'receptionist';
  const isAdmin = role === 'admin';
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 5;
  const previousSearchTermRef = useRef('');

  // Dữ liệu từ API
  const [medicines, setMedicines] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [stats, setStats] = useState({
    total_medicines: 0,
    low_stock_count: 0,
    out_of_stock_count: 0,
    expiring_soon_count: 0,
    total_quantity: 0
  });

  // Form thêm / sửa thuốc
  const [medicineForm, setMedicineForm] = useState({
    drug_name: '',
    unit: 'viên',
    initial_quantity: '',
    price: '',
    import_price: '',
    supplier_id: '',
    expiry_date: ''
  });

  const [errors, setErrors] = useState({});

  const unitOptions = [
    'viên', 'vỉ', 'lọ', 'ml', 'mg', 'g', 'kg', 'tuýp', 'gói', 'chai', 'hộp', 'ống', 'viên nang', 'viên sủi', 'viên nén', 'khác'
  ];

  // Hàm hiện thông báo
  const showToast = (message, type) => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: '' });
    }, 3000);
  };

  // Tải danh sách thuốc với phân trang
  const loadMedicines = useCallback(async (page, search) => {
    setIsLoading(true);
    try {
      const filters = {};
      if (search && search.trim()) {
        filters.search = search.trim();
      }

      const result = await getMedicines(page, itemsPerPage, filters);
      if (result.success && result.data) {
        setMedicines(result.data.medicines || []);
        setTotalPages(result.data.pagination?.total_pages || 1);
      } else {
        console.error("API Error:", result.error);
        showToast(result.error || 'Có lỗi xảy ra khi tải danh sách thuốc', 'error');
      }
    } catch (error) {
      console.error('Error loading medicines:', error);
      showToast('Có lỗi xảy ra khi tải danh sách thuốc', 'error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Tải thống kê
  const loadStats = async () => {
    try {
      const result = await getMedicineStats();
      if (result.success && result.data) {
        setStats(result.data);
      } else {
        console.error("Stats API Error:", result.error);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  // Tải dữ liệu khi component mount và khi trang thay đổi
  useEffect(() => {
    loadMedicines(currentPage, searchTerm);
  }, [currentPage, searchTerm, loadMedicines]);

  // Tải danh sách nhà cung cấp
  useEffect(() => {
    const loadSuppliers = async () => {
      try {
        const result = await getActiveSuppliers();
        if (result.success && result.data) {
          setSuppliers(result.data);
        } else {
          setSuppliers([]);
        }
      } catch (error) {
        console.error('Error loading suppliers:', error);
        setSuppliers([]);
      }
    };
    loadSuppliers();
  }, []);

  // Tải thống kê một lần khi mount cho Admin và Lễ tân
  useEffect(() => {
    if (isAdmin || isReceptionist) {
      loadStats();
    }
  }, [isAdmin, isReceptionist]);

  // Hiệu ứng tìm kiếm với debounce - reset trang khi từ khóa thay đổi
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm !== previousSearchTermRef.current) {
        previousSearchTermRef.current = searchTerm;
        if (currentPage !== 1) {
          setCurrentPage(1);
        }
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, currentPage]);

  // Xử lý thay đổi form thêm / sửa thuốc
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setMedicineForm(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Validate form thêm / sửa thuốc
  const validateForm = (isEdit = false) => {
    const newErrors = {};

    if (!medicineForm.drug_name.trim()) {
      newErrors.drug_name = 'Tên thuốc không được để trống';
    }

    if (!medicineForm.unit.trim()) {
      newErrors.unit = 'Đơn vị không được để trống';
    }

    if (!medicineForm.price || medicineForm.price <= 0) {
      newErrors.price = 'Giá phải lớn hơn 0';
    }

    // Chỉ validate import_price và initial_quantity khi thêm mới
    if (!isEdit) {
      if (!medicineForm.import_price || medicineForm.import_price < 0) {
        newErrors.import_price = 'Giá nhập phải lớn hơn hoặc bằng 0';
      }

      if (!medicineForm.initial_quantity || medicineForm.initial_quantity < 0) {
        newErrors.initial_quantity = 'Số lượng ban đầu không được âm';
      }
    } else {
      // Khi chỉnh sửa, validate stock_quantity
      if (!medicineForm.stock_quantity || medicineForm.stock_quantity < 0) {
        newErrors.stock_quantity = 'Số lượng không được âm';
      }
    }

    if (!medicineForm.expiry_date) {
      newErrors.expiry_date = 'Ngày hết hạn không được để trống';
    } else {
      const expiryDate = new Date(medicineForm.expiry_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      expiryDate.setHours(0, 0, 0, 0);
      if (expiryDate <= today) {
        newErrors.expiry_date = 'Ngày hết hạn phải lớn hơn ngày hiện tại';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Reset form
  const resetForm = () => {
    setMedicineForm({
      drug_name: '',
      unit: 'viên',
      initial_quantity: '',
      price: '',
      import_price: '',
      supplier_id: '',
      expiry_date: ''
    });
    setErrors({});
  };

  // Xử lý thêm thuốc
  const handleAddMedicine = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const initialQty = parseInt(medicineForm.initial_quantity);
      const result = await createMedicine({
        ...medicineForm,
        price: parseFloat(medicineForm.price),
        import_price: parseFloat(medicineForm.import_price || 0),
        stock_quantity: initialQty,
        initial_quantity: initialQty,
        supplier_id: medicineForm.supplier_id || null
      });
      
      if (result.success) {
        showToast(result.message || 'Thuốc đã được thêm thành công!', 'success');
        setShowAddForm(false);
        resetForm();
        loadMedicines(currentPage, searchTerm);
        loadStats();
      } else {
        // Kiểm tra lỗi trùng lặp tên thuốc
        if (result.message && result.message.includes('đã tồn tại')) {
          showToast('Tên thuốc đã tồn tại trong hệ thống. Vui lòng sử dụng tên khác!', 'error');
        } else {
          showToast(result.error || result.message || 'Có lỗi xảy ra khi thêm thuốc!', 'error');
        }
      }
    } catch (error) {
      console.error('Add medicine error:', error);
      showToast('Có lỗi xảy ra khi thêm thuốc!', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Xử lý sửa thuốc
  const handleEditMedicine = async () => {
    if (!validateForm(true)) {
      return;
    }

    setIsLoading(true);
    try {
      let result;
      if (isReceptionist) {
        // Chỉ cho phép cập nhật số lượng qua endpoint tồn kho
        const newQty = parseInt(medicineForm.stock_quantity);
        const currentQty = parseInt(selectedMedicine.stock_quantity);
        const diff = newQty - currentQty;
        if (diff === 0) {
          showToast('Số lượng không thay đổi', 'success');
          setShowEditForm(false);
          setSelectedMedicine(null);
          setIsLoading(false);
          return;
        }
        result = await updateMedicineStock(
          selectedMedicine._id,
          Math.abs(diff),
          diff > 0 ? 'add' : 'subtract'
        );
      } else {
        result = await updateMedicine(selectedMedicine._id, {
          ...medicineForm,
          price: parseFloat(medicineForm.price),
          stock_quantity: parseInt(medicineForm.stock_quantity)
        });
      }
      
      if (result.success) {
        showToast(result.message || 'Thuốc đã được cập nhật thành công!', 'success');
        setShowEditForm(false);
        setSelectedMedicine(null);
        resetForm();
        loadMedicines(currentPage, searchTerm);
        if (isAdmin || isReceptionist) {
          loadStats();
        }
      } else {
        if (result.message && result.message.includes('đã tồn tại')) {
          showToast('Tên thuốc đã tồn tại trong hệ thống. Vui lòng sử dụng tên khác!', 'error');
        } else {
          showToast(result.error || result.message || 'Có lỗi xảy ra khi cập nhật thuốc!', 'error');
        }
      }
    } catch (error) {
      console.error('Edit medicine error:', error);
      showToast('Có lỗi xảy ra khi cập nhật thuốc!', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Xử lý xóa thuốc
  const handleDeleteMedicine = async (medicine) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa thuốc "${medicine.drug_name}"?`)) {
      setIsLoading(true);
      try {
        const result = await deleteMedicine(medicine._id);
        
        if (result.success) {
          showToast(result.message || 'Thuốc đã được xóa thành công!', 'success');
          loadMedicines(currentPage, searchTerm);
          loadStats();
        } else {
          showToast(result.error || 'Có lỗi xảy ra khi xóa thuốc!', 'error');
        }
      } catch (error) {
        console.error('Delete medicine error:', error);
        showToast('Có lỗi xảy ra khi xóa thuốc!', 'error');
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Mở form chỉnh sửa với dữ liệu thuốc đã chọn
  const openEditForm = (medicine) => {
    setSelectedMedicine(medicine);
  
    let formattedDate = '';
    if (medicine.expiry_date) {
      const date = new Date(medicine.expiry_date);
      formattedDate = date.toISOString().split('T')[0];
    }
    
    setMedicineForm({
      drug_name: medicine.drug_name,
      unit: medicine.unit,
      price: medicine.price.toString(),
      stock_quantity: medicine.stock_quantity.toString(),
      expiry_date: formattedDate
    });
    setShowEditForm(true);
  };

  // Hiển thị badge tình trạng tồn kho
  const getStockBadge = (quantity) => {
    if (quantity <= 10) {
      return <Badge variant="destructive" className="text-red-600">Sắp hết</Badge>;
    } else if (quantity <= 50) {
      return <Badge variant="default" className="text-yellow-600">Ít</Badge>;
    } else {
      return <></>;
    }
  };

  // Định dạng giá tiền
  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };

  // Định dạng ngày tháng
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
  };

  // Kiểm tra sắp hết hạn (trong vòng 90 ngày)
  const isExpiringSoon = (expiryDate) => {
    const expiry = new Date(expiryDate);
    const today = new Date();
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 90;
  };

  // Kiểm tra đã hết hạn (tính theo ngày)
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

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  return (
    <div className="min-h-screen w-full bg-white relative overflow-hidden">
      {toast.show && (
        <div className={`fixed top-4 right-4 z-[100] p-4 rounded-md shadow-lg max-w-sm ${
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
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Quản lý kho thuốc</h1>
                <p className="text-sm text-gray-600">Danh sách và quản lý thuốc trong kho</p>
              </div>
              <div className="flex items-center space-x-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    if (isAdmin) {
                      navigate('/admin');
                    } else if (isReceptionist) {
                      navigate('/receptionist');
                    } else {
                      navigate('/');
                    }
                  }}
                  className="flex items-center gap-2"
                >
                  Quay lại
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Tìm kiếm thuốc theo tên, đơn vị..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            {isAdmin && (
              <Button onClick={() => setShowAddForm(true)}>
                + Thêm thuốc mới
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{stats.total_medicines}</div>
                  <div className="text-sm text-gray-600">Tổng số loại thuốc</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {stats.total_quantity}
                  </div>
                  <div className="text-sm text-gray-600">Tổng số lượng</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {stats.low_stock_count}
                  </div>
                  <div className="text-sm text-gray-600">Thuốc sắp hết</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {stats.expiring_soon_count}
                  </div>
                  <div className="text-sm text-gray-600">Sắp hết hạn</div>
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="space-y-4">
            {medicines.length === 0 ? (
              <Card>
                <CardContent className="p-8">
                  <div className="text-center text-gray-500">
                    <p>{isLoading ? 'Đang tải dữ liệu...' : 'Không tìm thấy thuốc nào phù hợp'}</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              medicines.map((medicine) => (
                <Card key={medicine._id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="font-semibold text-lg">{medicine.drug_name}</h3>
                          {!medicine.is_active && (
                            <Badge variant="destructive" className="bg-gray-600 text-white">Ngưng bán</Badge>
                          )}
                          {getStockBadge(medicine.stock_quantity)}
                          {isExpired(medicine.expiry_date) ? (
                            <Badge variant="destructive" className="bg-red-600 text-white">Hết hạn</Badge>
                          ) : (
                            isExpiringSoon(medicine.expiry_date) && (
                              <Badge variant="destructive" className="text-red-600">Sắp hết hạn</Badge>
                            )
                          )}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Đơn vị:</span> {medicine.unit}
                          </div>
                          <div>
                            <span className="font-medium">Giá:</span> {formatPrice(medicine.price)}
                          </div>
                          <div>
                            <span className="font-medium">Số lượng:</span> {medicine.stock_quantity}
                          </div>
                          <div>
                            <span className="font-medium">Hết hạn:</span> {formatDate(medicine.expiry_date)}
                          </div>
                          {medicine.supplier_id && (
                            <div className="md:col-span-2">
                              <span className="font-medium">Nhà cung cấp:</span> {medicine.supplier_id.name}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex space-x-2 ml-4">
                        {!isReceptionist && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditForm(medicine)}
                            >
                              Sửa
                            </Button>
                            <Button
                              size="sm"
                              className="bg-red-600 hover:bg-red-500 text-white"
                              variant="destructive"
                              onClick={() => handleDeleteMedicine(medicine)}
                            >
                              Xóa
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}

            {totalPages > 1 && (
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

      {/* Modal Thêm thuốc - chỉ hiển thị cho Admin */}
      {isAdmin && showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Thêm thuốc mới</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowAddForm(false);
                  resetForm();
                }}
              >
                ✕
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="drug_name">Tên thuốc *</Label>
                <Input
                  id="drug_name"
                  name="drug_name"
                  value={medicineForm.drug_name}
                  onChange={handleFormChange}
                  placeholder="Paracetamol 500mg"
                  disabled={isReceptionist}
                  className={"mt-3"}
                />
                {errors.drug_name && <span className="text-red-500 text-sm">{errors.drug_name}</span>}
              </div>

              <div>
                <Label htmlFor="unit">Đơn vị *</Label>
                <select
                  id="unit"
                  name="unit"
                  value={medicineForm.unit}
                  onChange={handleFormChange}
                  className="flex h-9 w-full rounded-md border mt-3 border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  disabled={isReceptionist}
                >
                  {unitOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
                {errors.unit && <span className="text-red-500 text-sm">{errors.unit}</span>}
              </div>

              <div>
                <Label htmlFor="price">Giá bán (VNĐ) *</Label>
                <Input
                  id="price"
                  name="price"
                  type="number"
                  className={"mt-3"}
                  value={medicineForm.price}
                  onChange={handleFormChange}
                  placeholder="25000"
                  disabled={isReceptionist}
                />
                {errors.price && <span className="text-red-500 text-sm">{errors.price}</span>}
              </div>

              <div>
                <Label htmlFor="import_price">Giá nhập (VNĐ) *</Label>
                <Input
                  id="import_price"
                  name="import_price"
                  type="number"
                  className={"mt-3"}
                  value={medicineForm.import_price}
                  onChange={handleFormChange}
                  placeholder="20000"
                  disabled={isReceptionist}
                />
                {errors.import_price && <span className="text-red-500 text-sm">{errors.import_price}</span>}
              </div>

              <div>
                <Label htmlFor="initial_quantity">Số lượng ban đầu *</Label>
                <Input
                  id="initial_quantity"
                  name="initial_quantity"
                  type="number"
                  className={"mt-3"}
                  value={medicineForm.initial_quantity}
                  onChange={handleFormChange}
                  placeholder="100"
                  disabled={isReceptionist}
                />
                {errors.initial_quantity && <span className="text-red-500 text-sm">{errors.initial_quantity}</span>}
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="expiry_date">Ngày hết hạn *</Label>
                <Input
                  id="expiry_date"
                  name="expiry_date"
                  type="date"
                  className={"mt-3"}
                  value={medicineForm.expiry_date}
                  onChange={handleFormChange}
                  disabled={isReceptionist}
                />
                {errors.expiry_date && <span className="text-red-500 text-sm">{errors.expiry_date}</span>}
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="supplier_id">Nhà cung cấp</Label>
                <select
                  id="supplier_id"
                  name="supplier_id"
                  value={medicineForm.supplier_id}
                  onChange={handleFormChange}
                  disabled={isReceptionist}
                  className="flex h-10 w-full rounded-md border mt-3 border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">-- Chọn nhà cung cấp (tùy chọn) --</option>
                  {suppliers.map(supplier => (
                    <option key={supplier._id} value={supplier._id}>
                      {supplier.name} - {supplier.contact_person}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-6">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowAddForm(false);
                  resetForm();
                }}
              >
                Hủy
              </Button>
              <Button onClick={handleAddMedicine} disabled={isLoading}>
                {isLoading ? 'Đang thêm...' : 'Thêm thuốc'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Chỉnh sửa thuốc */}
      {showEditForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Chỉnh sửa thuốc</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowEditForm(false);
                  setSelectedMedicine(null);
                  resetForm();
                }}
              >
                ✕
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_drug_name">Tên thuốc *</Label>
                <Input
                  id="edit_drug_name"
                  name="drug_name"
                  className="mt-3"
                  value={medicineForm.drug_name}
                  onChange={handleFormChange}
                  placeholder="Paracetamol 500mg"
                  disabled={isReceptionist}
                />
                {errors.drug_name && <span className="text-red-500 text-sm">{errors.drug_name}</span>}
              </div>

              <div>
                <Label htmlFor="edit_unit">Đơn vị *</Label>
                <select
                  id="edit_unit"
                  name="unit"
                  value={medicineForm.unit}
                  onChange={handleFormChange}
                  className="flex h-9 w-full rounded-md border mt-3 border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  disabled={isReceptionist}
                >
                  {unitOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
                {errors.unit && <span className="text-red-500 text-sm">{errors.unit}</span>}
              </div>

              <div>
                <Label htmlFor="edit_price">Giá (VNĐ) *</Label>
                <Input
                  id="edit_price"
                  name="price"
                  className="mt-3"
                  type="number"
                  value={medicineForm.price}
                  onChange={handleFormChange}
                  placeholder="2500"
                  disabled={isReceptionist}
                />
                {errors.price && <span className="text-red-500 text-sm">{errors.price}</span>}
              </div>

              <div>
                <Label htmlFor="edit_stock_quantity">Số lượng *</Label>
                <Input
                  id="edit_stock_quantity"
                  name="stock_quantity"
                  className="mt-3"
                  type="number"
                  value={medicineForm.stock_quantity}
                  onChange={handleFormChange}
                  placeholder="100"
                />
                {errors.stock_quantity && <span className="text-red-500 text-sm">{errors.stock_quantity}</span>}
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="edit_expiry_date">Ngày hết hạn *</Label>
                <Input
                  id="edit_expiry_date"
                  name="expiry_date"
                  className="mt-3"
                  type="date"
                  value={medicineForm.expiry_date}
                  onChange={handleFormChange}
                  disabled={isReceptionist}
                />
                {errors.expiry_date && <span className="text-red-500 text-sm">{errors.expiry_date}</span>}
              </div>
            </div>

            <div className="flex justify-between items-center pt-6 border-t mt-6">
              <div>
                {!isReceptionist && (
                  <Button 
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      if (selectedMedicine) {
                        setShowEditForm(false);
                        handleDeleteMedicine(selectedMedicine);
                      }
                    }}
                    disabled={isLoading}
                    className="bg-red-600 hover:bg-red-500 text-white"
                  >
                    🗑️ Xóa thuốc
                  </Button>
                )}
              </div>
              <div className="flex space-x-3">
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowEditForm(false);
                    setSelectedMedicine(null);
                    resetForm();
                  }}
                >
                  Hủy
                </Button>
                <Button size="sm" onClick={handleEditMedicine} disabled={isLoading}>
                  {isLoading ? 'Đang cập nhật...' : (isReceptionist ? 'Cập nhật số lượng' : 'Cập nhật')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DrugWarehouse;
