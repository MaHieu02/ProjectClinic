import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getSupplierById, updateSupplier } from "@/services/supplierService";
import { getMedicinesBySupplier, createMedicine, updatePaymentStatus } from "@/services/medicineService";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const SupplierDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [supplier, setSupplier] = useState(null);
  const [medicines, setMedicines] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddMedicineModal, setShowAddMedicineModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [isPaymentAll, setIsPaymentAll] = useState(false);
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

  // Tải dữ liệu nhà cung cấp và thuốc
  const loadSupplierData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const [supplierRes, medicinesRes] = await Promise.all([
        getSupplierById(id),
        getMedicinesBySupplier(id)
      ]);

      if (supplierRes.success) {
        setSupplier(supplierRes.data);
      } else {
        setError('Không thể tải thông tin nhà cung cấp');
      }

      if (medicinesRes.success) {
        setMedicines(medicinesRes.data || []);
      }
    } catch (error) {
      console.error('Error loading supplier data:', error);
      setError('Có lỗi xảy ra khi tải dữ liệu');
    } finally {
      setIsLoading(false);
    }
  };

  // Tải dữ liệu nhà cung cấp và thuốc
  useEffect(() => {
    const fetchData = async () => {
      await loadSupplierData();
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Set supplier_id mặc định khi mở modal
  useEffect(() => {
    if (showAddMedicineModal && id) {
      setMedicineForm(prev => ({
        ...prev,
        supplier_id: id
      }));
    }
  }, [showAddMedicineModal, id]);

  // Xử lý chuyển đổi trạng thái nhà cung cấp
  const handleToggleStatus = async () => {
    if (!supplier) return;

    const confirmMsg = supplier.is_active 
      ? 'Bạn có chắc muốn vô hiệu hóa nhà cung cấp này? Tất cả thuốc của nhà cung cấp cũng sẽ bị vô hiệu hóa.'
      : 'Bạn có chắc muốn kích hoạt lại nhà cung cấp này?';

    if (!confirm(confirmMsg)) return;

    try {
      const response = await updateSupplier(id, {
        ...supplier,
        is_active: !supplier.is_active
      });

      if (response.success) {
        alert(supplier.is_active ? 'Đã vô hiệu hóa nhà cung cấp' : 'Đã kích hoạt nhà cung cấp');
        await loadSupplierData();
      } else {
        alert('Có lỗi xảy ra: ' + (response.error || 'Không xác định'));
      }
    } catch (error) {
      console.error('Error toggling supplier status:', error);
      alert('Có lỗi xảy ra khi cập nhật trạng thái');
    }
  };

  // Xử lý thay đổi form thuốc
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

  // Validate form thuốc
  const validateForm = () => {
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

    if (!medicineForm.import_price || medicineForm.import_price < 0) {
      newErrors.import_price = 'Giá nhập phải lớn hơn hoặc bằng 0';
    }

    if (!medicineForm.initial_quantity || medicineForm.initial_quantity < 0) {
      newErrors.initial_quantity = 'Số lượng ban đầu không được âm';
    }

    if (!medicineForm.expiry_date) {
      newErrors.expiry_date = 'Ngày hết hạn không được để trống';
    } else {
      const expiryDate = new Date(medicineForm.expiry_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (expiryDate <= today) {
        newErrors.expiry_date = 'Ngày hết hạn phải lớn hơn ngày hiện tại';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Reset form thuốc
  const resetForm = () => {
    setMedicineForm({
      drug_name: '',
      unit: 'viên',
      initial_quantity: '',
      price: '',
      import_price: '',
      supplier_id: id,
      expiry_date: ''
    });
    setErrors({});
  };

  // Xử lý thêm thuốc
  const handleAddMedicine = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      const medicineData = {
        drug_name: medicineForm.drug_name,
        unit: medicineForm.unit,
        price: parseFloat(medicineForm.price),
        initial_quantity: parseFloat(medicineForm.initial_quantity),
        stock_quantity: parseFloat(medicineForm.initial_quantity),
        import_price: parseFloat(medicineForm.import_price),
        expiry_date: medicineForm.expiry_date,
        supplier_id: medicineForm.supplier_id
      };

      const response = await createMedicine(medicineData);

      if (response.success) {
        alert('Thêm thuốc thành công!');
        setShowAddMedicineModal(false);
        resetForm();
        await loadSupplierData();
      } else {
        alert('Có lỗi xảy ra: ' + (response.error || 'Không xác định'));
      }
    } catch (error) {
      console.error('Error adding medicine:', error);
      alert('Có lỗi xảy ra khi thêm thuốc: ' + (error?.message || 'Không xác định'));
    }
  };

  // Xử lý tất toán đơn thuốc
  const handlePaymentSingle = async (medicine) => {
    if (medicine.payment_status) {
      alert('Đơn thuốc này đã được tất toán!');
      return;
    }

    setSelectedMedicine(medicine);
    setIsPaymentAll(false);
    setShowPaymentModal(true);
  };

  // Xử lý tất toán tất cả đơn thuốc
  const handlePaymentAll = async () => {
    const unpaidMedicines = medicines.filter(m => !m.payment_status);
    
    if (unpaidMedicines.length === 0) {
      alert('Tất cả đơn thuốc đã được tất toán!');
      return;
    }

    setSelectedMedicine(unpaidMedicines);
    setIsPaymentAll(true);
    setShowPaymentModal(true);
  };

  // Xác nhận tất toán
  const confirmPayment = async () => {
    if (!selectedMedicine) return;

    try {
      if (isPaymentAll) {
        // Tất toán toàn bộ
        const updatePromises = selectedMedicine.map(medicine => 
          updatePaymentStatus(medicine._id, true)
        );
        
        const results = await Promise.all(updatePromises);
        const successCount = results.filter(r => r.success).length;

        if (successCount === selectedMedicine.length) {
          alert(`Đã tất toán thành công ${successCount} đơn thuốc!`);
        } else {
          alert(`Đã tất toán ${successCount}/${selectedMedicine.length} đơn thuốc. Vui lòng kiểm tra lại.`);
        }
      } else {
        // Tất toán đơn lẻ
        const response = await updatePaymentStatus(selectedMedicine._id, true);
        if (response.success) {
          alert('Đã tất toán thành công!');
        } else {
          alert('Có lỗi xảy ra: ' + (response.error || 'Không xác định'));
          return;
        }
      }
      
      setShowPaymentModal(false);
      setSelectedMedicine(null);
      setIsPaymentAll(false);
      await loadSupplierData();
    } catch (error) {
      console.error('Error updating payment status:', error);
      alert('Có lỗi xảy ra khi tất toán');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  if (error || !supplier) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">⚠️</div>
          <p className="text-red-600">{error || 'Không tìm thấy nhà cung cấp'}</p>
          <Button className="mt-4" onClick={() => navigate('/admin')}>
            Quay lại
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-lg border-b-2 border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Chi tiết nhà cung cấp</h1>
                <p className="text-gray-600">{supplier.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge className={supplier.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                {supplier.is_active ? 'Đang hoạt động' : 'Đã vô hiệu hóa'}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/admin')}
              >
                ← Quay lại
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Thông tin nhà cung cấp */}
          <div className="lg:col-span-1">
            <Card className="border-2 border-gray-300">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">
                  Thông tin nhà cung cấp
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Tên nhà cung cấp</label>
                  <p className="text-gray-900 mt-1">{supplier.name}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Người liên hệ</label>
                  <p className="text-gray-900 mt-1">{supplier.contact_person || 'Chưa có'}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Số điện thoại</label>
                  <p className="text-gray-900 mt-1">{supplier.phone}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Email</label>
                  <p className="text-gray-900 mt-1">{supplier.email || 'Chưa có'}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Địa chỉ</label>
                  <p className="text-gray-900 mt-1">{supplier.address || 'Chưa có'}</p>
                </div>

                <div className="pt-4 border-t">
                  <Button
                    className={`w-full ${supplier.is_active ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
                    onClick={handleToggleStatus}
                  >
                    {supplier.is_active ? 'Vô hiệu hóa nhà cung cấp' : 'Kích hoạt nhà cung cấp'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Danh sách thuốc */}
          <div className="lg:col-span-2">
            <Card className="border-2 border-gray-300">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Danh sách thuốc ({medicines.length})</span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePaymentAll}
                      className="bg-green-600 hover:bg-green-700 text-white"
                      disabled={medicines.filter(m => !m.payment_status).length === 0}
                    >
                      💰 Tất toán toàn bộ
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAddMedicineModal(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      ➕ Thêm thuốc
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadSupplierData}
                    >
                      🔄 Làm mới
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {medicines.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <span className="text-4xl mb-4 block">💊</span>
                    <p>Chưa có thuốc nào từ nhà cung cấp này</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {medicines.map((medicine) => (
                      <div
                        key={medicine._id}
                        className="p-4 border rounded-lg bg-white hover:shadow-md transition-all duration-200"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-medium text-gray-900">{medicine.drug_name}</h3>
                              <Badge className={medicine.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                                {medicine.is_active ? 'Còn bán' : 'Ngưng bán'}
                              </Badge>
                              <Badge className={medicine.payment_status ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}>
                                {medicine.payment_status ? '✓ Đã tất toán' : '⏳ Chưa thanh toán'}
                              </Badge>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                              <div>
                                <span className="font-medium">Giá bán:</span>
                                <p className="text-blue-600 font-semibold">
                                  {medicine.price ? medicine.price.toLocaleString('vi-VN') : '0'} VNĐ
                                </p>
                              </div>

                              <div>
                                <span className="font-medium">Giá nhập:</span>
                                <p className="text-gray-700">
                                  {medicine.import_price ? medicine.import_price.toLocaleString('vi-VN') : '0'} VNĐ
                                </p>
                              </div>

                              <div>
                                <span className="font-medium">Số lượng nhập:</span>
                                <p>
                                  {medicine.initial_quantity || 0} {medicine.unit || ''}
                                </p>
                              </div>

                              <div>
                                <span className="font-medium">Số lượng tồn kho:</span>
                                <p className="text-green-600">{medicine.stock_quantity || 0} {medicine.unit || ''}</p>
                              </div>

                              <div className="col-span-2">
                                <span className="font-medium">Tổng tiền nhập:</span>
                                <p className="text-orange-600 font-semibold">
                                  {((medicine.import_price || 0) * (medicine.initial_quantity || 0)).toLocaleString('vi-VN')} VNĐ
                                </p>
                              </div>

                              {medicine.description && (
                                <div className="col-span-2">
                                  <span className="font-medium">Mô tả:</span>
                                  <p className="text-xs mt-1">{medicine.description}</p>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="ml-4">
                            <Button
                              size="sm"
                              onClick={() => handlePaymentSingle(medicine)}
                              disabled={medicine.payment_status}
                              className={medicine.payment_status ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}
                            >
                              {medicine.payment_status ? '✓ Đã thanh toán' : '💰 Tất toán'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Modal thêm thuốc */}
      {showAddMedicineModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Thêm thuốc mới</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowAddMedicineModal(false);
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
                  className="mt-3"
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
                  className="mt-3"
                  value={medicineForm.price}
                  onChange={handleFormChange}
                  placeholder="25000"
                />
                {errors.price && <span className="text-red-500 text-sm">{errors.price}</span>}
              </div>

              <div>
                <Label htmlFor="import_price">Giá nhập (VNĐ) *</Label>
                <Input
                  id="import_price"
                  name="import_price"
                  type="number"
                  className="mt-3"
                  value={medicineForm.import_price}
                  onChange={handleFormChange}
                  placeholder="20000"
                />
                {errors.import_price && <span className="text-red-500 text-sm">{errors.import_price}</span>}
              </div>

              <div>
                <Label htmlFor="initial_quantity">Số lượng ban đầu *</Label>
                <Input
                  id="initial_quantity"
                  name="initial_quantity"
                  type="number"
                  className="mt-3"
                  value={medicineForm.initial_quantity}
                  onChange={handleFormChange}
                  placeholder="100"
                />
                {errors.initial_quantity && <span className="text-red-500 text-sm">{errors.initial_quantity}</span>}
              </div>

              <div>
                <Label htmlFor="expiry_date">Ngày hết hạn *</Label>
                <Input
                  id="expiry_date"
                  name="expiry_date"
                  type="date"
                  className="mt-3"
                  value={medicineForm.expiry_date}
                  onChange={handleFormChange}
                />
                {errors.expiry_date && <span className="text-red-500 text-sm">{errors.expiry_date}</span>}
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="supplier_id">Nhà cung cấp</Label>
                <div className="bg-blue-50 p-3 rounded-lg mt-3 border border-blue-200">
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Nhà cung cấp:</span> {supplier.name}
                    {supplier.contact_person && <span className="text-gray-600"> - {supplier.contact_person}</span>}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-6">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowAddMedicineModal(false);
                  resetForm();
                }}
              >
                Hủy
              </Button>
              <Button onClick={handleAddMedicine}>
                Thêm thuốc
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal tất toán */}
      {showPaymentModal && selectedMedicine && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {isPaymentAll ? 'Xác nhận tất toán toàn bộ' : 'Xác nhận tất toán'}
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedMedicine(null);
                  setIsPaymentAll(false);
                }}
              >
                ✕
              </Button>
            </div>

            {isPaymentAll ? (
              // Hiển thị tất toán toàn bộ
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-3">Danh sách thuốc chưa thanh toán</h4>
                  
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {selectedMedicine.map((medicine, index) => (
                      <div key={medicine._id} className="bg-white p-3 rounded border border-blue-100">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-gray-900">{index + 1}. {medicine.drug_name}</p>
                            <p className="text-sm text-gray-600">
                              Số lượng: {medicine.initial_quantity} {medicine.unit} | 
                              Giá nhập: {(medicine.import_price || 0).toLocaleString('vi-VN')} VNĐ
                            </p>
                          </div>
                          <p className="font-semibold text-orange-600">
                            {((medicine.import_price || 0) * (medicine.initial_quantity || 0)).toLocaleString('vi-VN')} VNĐ
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <h4 className="font-semibold text-green-900 mb-3">Tổng kết thanh toán</h4>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tổng số đơn thuốc:</span>
                      <span className="font-medium text-gray-900">{selectedMedicine.length} đơn</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-gray-600">Tổng số lượng nhập:</span>
                      <span className="font-medium text-gray-900">
                        {selectedMedicine.reduce((sum, m) => sum + (m.initial_quantity || 0), 0)} đơn vị
                      </span>
                    </div>

                    <div className="border-t border-green-300 my-2"></div>

                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">Tổng giá nhập:</span>
                      <span className="font-bold text-red-600 text-lg">
                        {selectedMedicine.reduce((sum, m) => sum + ((m.import_price || 0) * (m.initial_quantity || 0)), 0).toLocaleString('vi-VN')} VNĐ
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                  <p className="text-sm text-orange-800">
                    <span className="font-semibold">⚠️ Lưu ý:</span> Sau khi tất toán, bạn sẽ thanh toán 
                    <span className="font-bold"> {selectedMedicine.reduce((sum, m) => sum + ((m.import_price || 0) * (m.initial_quantity || 0)), 0).toLocaleString('vi-VN')} VNĐ </span> 
                    cho nhà cung cấp <span className="font-semibold">{supplier.name}</span>.
                  </p>
                </div>
              </div>
            ) : (
              // Hiển thị tất toán đơn lẻ
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-3">Thông tin thuốc</h4>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tên thuốc:</span>
                    <span className="font-medium text-gray-900">{selectedMedicine.drug_name}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-600">Số lượng nhập:</span>
                    <span className="font-medium text-gray-900">
                      {selectedMedicine.initial_quantity || 0} {selectedMedicine.unit}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-600">Số lượng hiện tại:</span>
                    <span className="font-medium text-green-600">
                      {selectedMedicine.stock_quantity || 0} {selectedMedicine.unit}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-600">Đã bán:</span>
                    <span className="font-medium text-orange-600">
                      {(selectedMedicine.initial_quantity || 0) - (selectedMedicine.stock_quantity || 0)} {selectedMedicine.unit}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h4 className="font-semibold text-green-900 mb-3">Chi tiết thanh toán</h4>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Giá nhập (đơn vị):</span>
                    <span className="font-medium text-gray-900">
                      {(selectedMedicine.import_price || 0).toLocaleString('vi-VN')} VNĐ
                    </span>
                  </div>

                  <div className="border-t border-green-300 my-2"></div>

                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">Tổng giá nhập:</span>
                    <span className="font-bold text-red-600 text-lg">
                      {((selectedMedicine.import_price || 0) * (selectedMedicine.initial_quantity || 0)).toLocaleString('vi-VN')} VNĐ
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                <p className="text-sm text-orange-800">
                  <span className="font-semibold">⚠️ Lưu ý:</span> Sau khi tất toán, bạn sẽ thanh toán 
                  <span className="font-bold"> {((selectedMedicine.import_price || 0) * (selectedMedicine.initial_quantity || 0)).toLocaleString('vi-VN')} VNĐ </span> 
                  cho nhà cung cấp <span className="font-semibold">{supplier.name}</span>.
                </p>
              </div>
            </div>
            )}

            <div className="flex justify-end space-x-3 pt-6">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedMedicine(null);
                }}
              >
                Hủy
              </Button>
              <Button 
                onClick={confirmPayment}
                className="bg-green-600 hover:bg-green-700"
              >
                💰 Xác nhận tất toán
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierDetail;
