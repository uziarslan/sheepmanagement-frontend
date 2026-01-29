import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  HiOutlinePlus,
  HiOutlineEye,
  HiOutlineTrash,
  HiOutlineFilter,
  HiOutlineBeaker,
  HiOutlineX
} from 'react-icons/hi';
import { GiSheep } from 'react-icons/gi';
import { animalAPI, penAPI, stockAPI, healthAPI } from '../../services/mockApi';
import { formatCurrency, formatDate, filterBySearch } from '../../utils/helpers';
import {
  PageHeader,
  Card,
  Button,
  Input,
  Select,
  Textarea,
  SearchInput,
  Badge,
  Table,
  TableHead,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableEmpty
} from '../../components/common';
import Modal, { ConfirmDialog } from '../../components/common/Modal';
import { PageLoader } from '../../components/common/Spinner';

const Vaccination = () => {
  const [vaccinations, setVaccinations] = useState([]);
  const [animals, setAnimals] = useState([]);
  const [pens, setPens] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  
  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [viewModal, setViewModal] = useState({ open: false, data: null });
  const [deleteModal, setDeleteModal] = useState({ open: false, item: null });
  const [deleting, setDeleting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    scope: 'Individual', // All Animals, Shed, Individual
    penId: '',
    animalIds: [],
    date: new Date().toISOString().split('T')[0],
    vaccineName: '',
    medicines: [],
    comments: ''
  });

  // Medicine selection
  const [selectedMedicine, setSelectedMedicine] = useState({
    medicineId: '',
    quantity: ''
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [animalsRes, pensRes, stocksRes, vaccinationsRes] = await Promise.all([
        animalAPI.getAll(),
        penAPI.getAll(),
        stockAPI.getAll(),
        healthAPI.getVaccinations()
      ]);
      
      if (animalsRes.success) setAnimals(animalsRes.data.filter(a => a.status === 'Active'));
      if (pensRes.success) setPens(pensRes.data);
      if (stocksRes.success) setMedicines(stocksRes.data.filter(s => s.category === 'Medication'));
      if (vaccinationsRes.success) setVaccinations(vaccinationsRes.data);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleMedicineChange = (e) => {
    const { name, value } = e.target;
    setSelectedMedicine(prev => ({ ...prev, [name]: value }));
  };

  const addMedicine = () => {
    if (!selectedMedicine.medicineId || !selectedMedicine.quantity) {
      toast.error('Please select medicine and enter quantity');
      return;
    }

    const medicine = medicines.find(m => m.id === parseInt(selectedMedicine.medicineId));
    if (!medicine) return;

    const qty = parseFloat(selectedMedicine.quantity);
    if (qty > medicine.currentQty) {
      toast.error(`Insufficient stock. Available: ${medicine.currentQty} ${medicine.unit}`);
      return;
    }

    const existingIndex = formData.medicines.findIndex(m => m.medicineId === medicine.id);
    if (existingIndex !== -1) {
      toast.error('Medicine already added');
      return;
    }

    const medicineEntry = {
      medicineId: medicine.id,
      name: medicine.productName,
      packSize: medicine.openingStockQty,
      currentQty: medicine.currentQty,
      unit: medicine.unit,
      rate: medicine.openingRatePerUnit,
      quantity: qty,
      total: qty * medicine.openingRatePerUnit
    };

    setFormData(prev => ({
      ...prev,
      medicines: [...prev.medicines, medicineEntry]
    }));

    setSelectedMedicine({ medicineId: '', quantity: '' });
  };

  const removeMedicine = (index) => {
    setFormData(prev => ({
      ...prev,
      medicines: prev.medicines.filter((_, i) => i !== index)
    }));
  };

  const handleAnimalSelect = (animalId) => {
    setFormData(prev => ({
      ...prev,
      animalIds: prev.animalIds.includes(animalId)
        ? prev.animalIds.filter(id => id !== animalId)
        : [...prev.animalIds, animalId]
    }));
  };

  const selectAllAnimals = () => {
    const eligibleAnimals = formData.scope === 'Shed' && formData.penId
      ? animals.filter(a => a.penId === parseInt(formData.penId))
      : animals;
    setFormData(prev => ({
      ...prev,
      animalIds: eligibleAnimals.map(a => a.id)
    }));
  };

  const clearSelection = () => {
    setFormData(prev => ({ ...prev, animalIds: [] }));
  };

  const validate = () => {
    const newErrors = {};
    
    if (!formData.date) newErrors.date = 'Date is required';
    if (!formData.vaccineName.trim()) newErrors.vaccineName = 'Vaccine name is required';
    if (formData.medicines.length === 0) newErrors.medicines = 'Add at least one medicine';
    if (formData.scope === 'Shed' && !formData.penId) newErrors.penId = 'Select a pen';
    if (formData.scope === 'Individual' && formData.animalIds.length === 0) {
      newErrors.animalIds = 'Select at least one animal';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      let targetAnimals = [];
      
      if (formData.scope === 'All Animals') {
        targetAnimals = animals.map(a => a.id);
      } else if (formData.scope === 'Shed') {
        targetAnimals = animals.filter(a => a.penId === parseInt(formData.penId)).map(a => a.id);
      } else {
        targetAnimals = formData.animalIds;
      }

      const vaccinationData = {
        scope: formData.scope,
        penId: formData.penId ? parseInt(formData.penId) : null,
        animalIds: targetAnimals,
        date: formData.date,
        vaccineName: formData.vaccineName,
        medicines: formData.medicines,
        totalAmount: formData.medicines.reduce((sum, m) => sum + m.total, 0),
        comments: formData.comments,
        animalCount: targetAnimals.length
      };

      const response = await healthAPI.createVaccination(vaccinationData);
      
      if (response.success) {
        toast.success(`Vaccination recorded for ${targetAnimals.length} animal(s)`);
        setVaccinations(prev => [response.data, ...prev]);
        closeModal();
      }
    } catch (error) {
      toast.error(error.message || 'Failed to record vaccination');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.item) return;
    
    setDeleting(true);
    try {
      await healthAPI.deleteVaccination(deleteModal.item.id);
      toast.success('Vaccination record deleted');
      setVaccinations(prev => prev.filter(v => v.id !== deleteModal.item.id));
      setDeleteModal({ open: false, item: null });
    } catch (error) {
      toast.error('Failed to delete record');
    } finally {
      setDeleting(false);
    }
  };

  const openModal = () => {
    setFormData({
      scope: 'Individual',
      penId: '',
      animalIds: [],
      date: new Date().toISOString().split('T')[0],
      vaccineName: '',
      medicines: [],
      comments: ''
    });
    setErrors({});
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setFormData({
      scope: 'Individual',
      penId: '',
      animalIds: [],
      date: new Date().toISOString().split('T')[0],
      vaccineName: '',
      medicines: [],
      comments: ''
    });
    setErrors({});
  };

  const getPenName = (penId) => {
    const pen = pens.find(p => p.id === penId);
    return pen ? pen.name : '-';
  };

  const filteredVaccinations = vaccinations.filter(v =>
    v.vaccineName?.toLowerCase().includes(search.toLowerCase()) ||
    formatDate(v.date).includes(search)
  );

  const totalMedicineAmount = formData.medicines.reduce((sum, m) => sum + m.total, 0);

  // Filter animals by pen if scope is Shed
  const eligibleAnimals = formData.scope === 'Shed' && formData.penId
    ? animals.filter(a => a.penId === parseInt(formData.penId))
    : animals;

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vaccination"
        subtitle="Manage animal vaccinations and immunizations"
        breadcrumbs={[
          { label: 'Health Management' },
          { label: 'Vaccination' }
        ]}
        action={
          <Button icon={HiOutlinePlus} onClick={openModal}>
            New Vaccination
          </Button>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600">
          <div className="text-white">
            <p className="text-blue-100 text-sm">Total Vaccinations</p>
            <p className="text-2xl font-bold mt-1">{vaccinations.length}</p>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600">
          <div className="text-white">
            <p className="text-emerald-100 text-sm">Animals Vaccinated</p>
            <p className="text-2xl font-bold mt-1">
              {vaccinations.reduce((sum, v) => sum + (v.animalCount || 0), 0)}
            </p>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500 to-purple-600">
          <div className="text-white">
            <p className="text-purple-100 text-sm">Total Cost</p>
            <p className="text-2xl font-bold mt-1">
              {formatCurrency(vaccinations.reduce((sum, v) => sum + (v.totalAmount || 0), 0))}
            </p>
          </div>
        </Card>
      </div>

      {/* Vaccinations List */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h3 className="text-lg font-semibold text-gray-800">Vaccination Records</h3>
          <div className="w-full sm:w-64">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search vaccinations..."
            />
          </div>
        </div>

        <Table>
          <TableHead>
            <TableHeader>Date</TableHeader>
            <TableHeader>Vaccine Name</TableHeader>
            <TableHeader>Scope</TableHeader>
            <TableHeader>Animals</TableHeader>
            <TableHeader>Medicines</TableHeader>
            <TableHeader>Total Cost</TableHeader>
            <TableHeader className="text-right">Actions</TableHeader>
          </TableHead>
          <TableBody>
            {filteredVaccinations.length === 0 ? (
              <TableEmpty
                message="No vaccination records found"
                colSpan={7}
              />
            ) : (
              filteredVaccinations.map((vaccination) => (
                <TableRow key={vaccination.id}>
                  <TableCell>
                    <span className="text-sm">{formatDate(vaccination.date)}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                        <HiOutlineBeaker className="w-4 h-4 text-blue-600" />
                      </div>
                      <span className="font-medium">{vaccination.vaccineName}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={
                      vaccination.scope === 'All Animals' ? 'success' :
                      vaccination.scope === 'Shed' ? 'warning' : 'info'
                    }>
                      {vaccination.scope}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{vaccination.animalCount} animals</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-600">
                      {vaccination.medicines?.length || 0} medicine(s)
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold text-emerald-600">
                      {formatCurrency(vaccination.totalAmount)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setViewModal({ open: true, data: vaccination })}
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <HiOutlineEye className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setDeleteModal({ open: true, item: vaccination })}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <HiOutlineTrash className="w-5 h-5" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* New Vaccination Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title="New Vaccination"
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Scope Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {['All Animals', 'Shed', 'Individual'].map((scope) => (
              <button
                key={scope}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, scope, animalIds: [], penId: '' }))}
                className={`p-4 rounded-xl border-2 transition-all ${
                  formData.scope === scope
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className={`font-medium ${formData.scope === scope ? 'text-emerald-700' : 'text-gray-700'}`}>
                  {scope}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {scope === 'All Animals' ? 'Vaccinate all' :
                   scope === 'Shed' ? 'By pen/shed' : 'Select specific'}
                </p>
              </button>
            ))}
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Date"
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              error={errors.date}
              required
            />
            <Input
              label="Vaccine Name"
              name="vaccineName"
              value={formData.vaccineName}
              onChange={handleChange}
              placeholder="e.g., PPR Vaccine, FMD Vaccine"
              error={errors.vaccineName}
              required
            />
          </div>

          {/* Pen Selection for Shed scope */}
          {formData.scope === 'Shed' && (
            <Select
              label="Select Pen/Shed"
              name="penId"
              value={formData.penId}
              onChange={handleChange}
              options={pens.map(p => ({ value: p.id, label: `${p.name} (${p.animalCount} animals)` }))}
              placeholder="Choose a pen"
              error={errors.penId}
              required
            />
          )}

          {/* Animal Selection for Individual or Shed scope */}
          {(formData.scope === 'Individual' || formData.scope === 'Shed') && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">
                  Select Animals {formData.animalIds.length > 0 && `(${formData.animalIds.length} selected)`}
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={selectAllAnimals}
                    className="text-xs text-emerald-600 hover:text-emerald-700"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Clear
                  </button>
                </div>
              </div>
              <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-xl p-2 space-y-1">
                {eligibleAnimals.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    {formData.scope === 'Shed' ? 'Select a pen first' : 'No animals available'}
                  </p>
                ) : (
                  eligibleAnimals.map((animal) => (
                    <label
                      key={animal.id}
                      className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                        formData.animalIds.includes(animal.id)
                          ? 'bg-emerald-50'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.animalIds.includes(animal.id)}
                        onChange={() => handleAnimalSelect(animal.id)}
                        className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                      />
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-emerald-100 flex items-center justify-center">
                          <GiSheep className="w-4 h-4 text-emerald-600" />
                        </div>
                        <span className="text-sm font-medium">{animal.tagId}</span>
                        <span className="text-xs text-gray-500">{animal.name}</span>
                      </div>
                    </label>
                  ))
                )}
              </div>
              {errors.animalIds && (
                <p className="mt-1 text-sm text-red-600">{errors.animalIds}</p>
              )}
            </div>
          )}

          {/* Medicine Selection */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Add Medicines
            </label>
            <div className="flex gap-3">
              <div className="flex-1">
                <Select
                  name="medicineId"
                  value={selectedMedicine.medicineId}
                  onChange={handleMedicineChange}
                  options={medicines.map(m => ({
                    value: m.id,
                    label: `${m.productName} (Stock: ${m.currentQty} ${m.unit})`
                  }))}
                  placeholder="Select medicine"
                />
              </div>
              <div className="w-32">
                <Input
                  type="number"
                  name="quantity"
                  value={selectedMedicine.quantity}
                  onChange={handleMedicineChange}
                  placeholder="Qty"
                />
              </div>
              <Button type="button" onClick={addMedicine} icon={HiOutlinePlus}>
                Add
              </Button>
            </div>
            {errors.medicines && (
              <p className="mt-1 text-sm text-red-600">{errors.medicines}</p>
            )}
          </div>

          {/* Selected Medicines Table */}
          {formData.medicines.length > 0 && (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Medicine</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Current Stock</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Rate</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Quantity</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Total</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Remaining</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {formData.medicines.map((med, index) => (
                    <tr key={index}>
                      <td className="px-4 py-2 text-sm font-medium">{med.name}</td>
                      <td className="px-4 py-2 text-sm">{med.currentQty} {med.unit}</td>
                      <td className="px-4 py-2 text-sm">{formatCurrency(med.rate)}</td>
                      <td className="px-4 py-2 text-sm">{med.quantity} {med.unit}</td>
                      <td className="px-4 py-2 text-sm font-medium text-emerald-600">{formatCurrency(med.total)}</td>
                      <td className="px-4 py-2 text-sm text-gray-500">{med.currentQty - med.quantity} {med.unit}</td>
                      <td className="px-4 py-2">
                        <button
                          type="button"
                          onClick={() => removeMedicine(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <HiOutlineX className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50">
                    <td colSpan={4} className="px-4 py-2 text-sm font-semibold text-right">Total Amount:</td>
                    <td colSpan={3} className="px-4 py-2 text-sm font-bold text-emerald-600">
                      {formatCurrency(totalMedicineAmount)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Comments */}
          <Textarea
            label="Comments"
            name="comments"
            value={formData.comments}
            onChange={handleChange}
            placeholder="Add any additional notes..."
            rows={3}
          />

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Record Vaccination
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Details Modal */}
      <Modal
        isOpen={viewModal.open}
        onClose={() => setViewModal({ open: false, data: null })}
        title="Vaccination Details"
        size="lg"
      >
        {viewModal.data && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Date</p>
                <p className="font-medium">{formatDate(viewModal.data.date)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Vaccine Name</p>
                <p className="font-medium">{viewModal.data.vaccineName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Scope</p>
                <Badge variant="info">{viewModal.data.scope}</Badge>
              </div>
              <div>
                <p className="text-sm text-gray-500">Animals Vaccinated</p>
                <p className="font-medium">{viewModal.data.animalCount}</p>
              </div>
            </div>
            
            <div>
              <p className="text-sm text-gray-500 mb-2">Medicines Used</p>
              <div className="border rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Medicine</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Quantity</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {viewModal.data.medicines?.map((med, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2 text-sm">{med.name}</td>
                        <td className="px-4 py-2 text-sm">{med.quantity} {med.unit}</td>
                        <td className="px-4 py-2 text-sm">{formatCurrency(med.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-500">Total Cost</p>
              <p className="text-xl font-bold text-emerald-600">{formatCurrency(viewModal.data.totalAmount)}</p>
            </div>

            {viewModal.data.comments && (
              <div>
                <p className="text-sm text-gray-500">Comments</p>
                <p className="text-gray-700">{viewModal.data.comments}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, item: null })}
        onConfirm={handleDelete}
        title="Delete Vaccination Record"
        message="Are you sure you want to delete this vaccination record? This action cannot be undone."
        confirmText="Delete"
        loading={deleting}
      />
    </div>
  );
};

export default Vaccination;
