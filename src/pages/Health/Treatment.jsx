import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  HiOutlinePlus,
  HiOutlineEye,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineX,
  HiOutlineCheck
} from 'react-icons/hi';
import { GiSheep } from 'react-icons/gi';
import { animalAPI, stockAPI, healthAPI } from '../../services/api';
import { groupStocksByNameAndRate } from '../../utils/stockUtils';
import { formatCurrency, formatDate } from '../../utils/helpers';
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
import { diagnosisTypes, treatmentTypes } from '../../data/mockData';

const Treatment = () => {
  const [treatments, setTreatments] = useState([]);
  const [animals, setAnimals] = useState([]);
  const [animalSearch, setAnimalSearch] = useState('');
  const [searchedAnimals, setSearchedAnimals] = useState([]);
  const [animalSearchLoading, setAnimalSearchLoading] = useState(false);
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  
  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState(null);
  const [viewModal, setViewModal] = useState({ open: false, data: null });
  const [deleteModal, setDeleteModal] = useState({ open: false, item: null });
  const [deleting, setDeleting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    animalId: '',
    findings: '',
    type: 'Treatment', // Treatment or Protocol
    diagnosis: '',
    medicines: [],
    duration: '',
    cured: 'No',
    comments: ''
  });

  // Medicine selection
  const [selectedMedicine, setSelectedMedicine] = useState({
    medicineId: '',
    quantity: '',
    unit: 'ml'
  });

  const [errors, setErrors] = useState({});

  // Helper to get id from item (supports both _id and id)
  const getId = (item) => item?._id ?? item?.id;
  // Helper to check cured status (backend uses cureStatus: 'Cured', form uses cured: 'Yes')
  const isCured = (treatment) =>
    treatment?.cureStatus === 'Cured' || treatment?.cured === 'Yes';

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const q = animalSearch.trim();
    if (!q) {
      setSearchedAnimals([]);
      setAnimalSearchLoading(false);
      return;
    }

    let cancelled = false;
    const run = async () => {
      setAnimalSearchLoading(true);
      try {
        const res = await animalAPI.getAll({ limit: 100, sort: 'tagId', search: q });
        if (cancelled) return;
        if (res.success) {
          const list = Array.isArray(res.data) ? res.data : [];
          setSearchedAnimals(list.filter(a => a.status === 'Active'));
        } else {
          setSearchedAnimals([]);
        }
      } catch (e) {
        if (!cancelled) setSearchedAnimals([]);
      } finally {
        if (!cancelled) setAnimalSearchLoading(false);
      }
    };
    run();

    return () => { cancelled = true; };
  }, [animalSearch]);

  const fetchData = async () => {
    try {
      const [animalsRes, stocksRes, treatmentsRes] = await Promise.all([
        // Backend caps limit at 100; default is 10 which feels "random" in dropdowns.
        animalAPI.getAll({ limit: 100, sort: 'tagId' }),
        stockAPI.getAll(),
        healthAPI.getTreatments()
      ]);
      
      if (animalsRes.success) setAnimals(animalsRes.data.filter(a => a.status === 'Active'));
      if (stocksRes.success) {
        const meds = stocksRes.data.filter(s => s.category === 'Medication');
        setMedicines(groupStocksByNameAndRate(meds));
      }
      if (treatmentsRes.success) setTreatments(treatmentsRes.data);
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

    // Auto-set unit from medicine data
    if (name === 'medicineId' && value) {
      const medicine = medicines.find(m => String(getId(m)) === String(value));
      if (medicine) {
        setSelectedMedicine(prev => ({ ...prev, unit: medicine.unit }));
      }
    }
  };

  const addMedicine = () => {
    if (!selectedMedicine.medicineId || !selectedMedicine.quantity) {
      toast.error('Please select medicine and enter quantity');
      return;
    }

    const medicine = medicines.find(m => String(getId(m)) === String(selectedMedicine.medicineId));
    if (!medicine) return;

    const medicineIdKey = getId(medicine);
    const qty = parseFloat(selectedMedicine.quantity);
    const currentQty = Number(medicine.currentQty ?? 0);
    if (qty > currentQty) {
      toast.error(`Insufficient stock. Available: ${currentQty} ${medicine.unit}`);
      return;
    }

    const medicineEntry = {
      medicineId: medicineIdKey,
      name: medicine.productName,
      rate: medicine.openingRatePerUnit || 0,
      unit: selectedMedicine.unit,
      quantity: qty,
      total: qty * (medicine.openingRatePerUnit || 0)
    };

    setFormData(prev => ({
      ...prev,
      medicines: [...prev.medicines, medicineEntry]
    }));

    setSelectedMedicine({ medicineId: '', quantity: '', unit: 'ml' });
  };

  const removeMedicine = (index) => {
    setFormData(prev => ({
      ...prev,
      medicines: prev.medicines.filter((_, i) => i !== index)
    }));
  };

  const validate = () => {
    const newErrors = {};
    
    if (!formData.date) newErrors.date = 'Date is required';
    if (!formData.animalId) newErrors.animalId = 'Select an animal';
    if (!formData.diagnosis) newErrors.diagnosis = 'Diagnosis is required';
    if (!formData.type) newErrors.type = 'Select treatment type';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const animalIdKey = String(formData.animalId).trim();
      const animal = animals.find(a => String(getId(a)) === String(animalIdKey));
      
      // Build backend-compatible payload
      const treatmentData = {
        date: formData.date,
        animal: animalIdKey,
        animalTagId: animal?.tagId,
        animalName: animal?.name,
        findings: formData.findings || null,
        type: formData.type,
        diagnosis: formData.diagnosis,
        medicines: formData.medicines.map(m => ({
          medicine: m.medicineId || m.medicine,
          medicineName: m.name,
          rate: m.rate,
          unit: m.unit,
          quantity: m.quantity,
          total: m.total
        })),
        duration: formData.duration ? parseInt(formData.duration, 10) || null : null,
        cureStatus: formData.cured === 'Yes' ? 'Cured' : 'In Treatment',
        comments: formData.comments || null
      };

      let response;
      if (isEdit) {
        response = await healthAPI.updateTreatment(editId, { 
          cureStatus: treatmentData.cureStatus,
          comments: treatmentData.comments 
        });
        if (response.success) {
          setTreatments(prev => prev.map(t => getId(t) === editId ? response.data : t));
          toast.success('Treatment updated successfully');
        }
      } else {
        response = await healthAPI.createTreatment(treatmentData);
        if (response.success) {
          setTreatments(prev => [response.data, ...prev]);
          toast.success('Treatment recorded successfully');
        }
      }
      
      closeModal();
    } catch (error) {
      toast.error(error.message || 'Failed to save treatment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.item) return;
    const itemId = getId(deleteModal.item);
    setDeleting(true);
    try {
      await healthAPI.deleteTreatment(itemId);
      toast.success('Treatment record deleted');
      setTreatments(prev => prev.filter(t => getId(t) !== itemId));
      setDeleteModal({ open: false, item: null });
    } catch (error) {
      toast.error('Failed to delete record');
    } finally {
      setDeleting(false);
    }
  };

  const openModal = (treatment = null) => {
    setAnimalSearch('');
    setSearchedAnimals([]);
    setAnimalSearchLoading(false);
    if (treatment) {
      setIsEdit(true);
      setEditId(getId(treatment));
      // Backend uses 'animal' and 'cureStatus', transform for form
      const animalRef = treatment.animal?._id || treatment.animal || treatment.animalId;
      const curedValue = treatment.cureStatus === 'Cured' || treatment.cured === 'Yes' ? 'Yes' : 'No';
      setFormData({
        date: treatment.date?.split?.('T')?.[0] || treatment.date,
        animalId: animalRef?.toString() || '',
        findings: treatment.findings || '',
        type: treatment.type,
        diagnosis: treatment.diagnosis,
        medicines: treatment.medicines || [],
        duration: treatment.duration?.toString() || '',
        cured: curedValue,
        comments: treatment.comments || ''
      });
    } else {
      setIsEdit(false);
      setEditId(null);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        animalId: '',
        findings: '',
        type: 'Treatment',
        diagnosis: '',
        medicines: [],
        duration: '',
        cured: 'No',
        comments: ''
      });
    }
    setErrors({});
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setIsEdit(false);
    setEditId(null);
    setAnimalSearch('');
    setSearchedAnimals([]);
    setAnimalSearchLoading(false);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      animalId: '',
      findings: '',
      type: 'Treatment',
      diagnosis: '',
      medicines: [],
      duration: '',
      cured: 'No',
      comments: ''
    });
    setErrors({});
  };

  const markAsCured = async (treatment) => {
    const treatmentId = getId(treatment);
    try {
      const response = await healthAPI.updateTreatment(treatmentId, { cureStatus: 'Cured' });
      if (response.success) {
        setTreatments(prev => prev.map(t => getId(t) === treatmentId ? { ...t, cured: 'Yes', cureStatus: 'Cured' } : t));
        toast.success('Animal marked as cured');
      }
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const filteredTreatments = treatments.filter(t =>
    t.animalTagId?.toLowerCase().includes(search.toLowerCase()) ||
    t.animalName?.toLowerCase().includes(search.toLowerCase()) ||
    t.diagnosis?.toLowerCase().includes(search.toLowerCase())
  );

  const totalMedicineAmount = formData.medicines.reduce((sum, m) => sum + m.total, 0);

  const animalOptionsSource = animalSearch.trim() ? searchedAnimals : animals;
  const animalOptions = animalOptionsSource
    .filter(a => a.status === 'Active')
    .sort((a, b) => String(a.tagId || '').localeCompare(String(b.tagId || '')))
    .map(a => ({ value: getId(a), label: `${a.tagId} - ${a.name || ''}`.trim() }));

  // Summary stats (support both cureStatus and cured from API)
  const curedCount = treatments.filter(t => isCured(t)).length;
  const uncuredCount = treatments.filter(t => !isCured(t)).length;
  const totalCost = treatments.reduce((sum, t) => sum + (t.totalAmount || 0), 0);

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Treatment"
        subtitle="Record and manage animal treatments"
        breadcrumbs={[
          { label: 'Health Management' },
          { label: 'Treatment' }
        ]}
        action={
          <Button icon={HiOutlinePlus} onClick={() => openModal()}>
            New Treatment
          </Button>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600">
          <div className="text-white">
            <p className="text-blue-100 text-sm">Total Treatments</p>
            <p className="text-2xl font-bold mt-1">{treatments.length}</p>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600">
          <div className="text-white">
            <p className="text-emerald-100 text-sm">Cured</p>
            <p className="text-2xl font-bold mt-1">{curedCount}</p>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500 to-orange-600">
          <div className="text-white">
            <p className="text-orange-100 text-sm">Under Treatment</p>
            <p className="text-2xl font-bold mt-1">{uncuredCount}</p>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500 to-purple-600">
          <div className="text-white">
            <p className="text-purple-100 text-sm">Total Cost</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(totalCost)}</p>
          </div>
        </Card>
      </div>

      {/* Treatments List */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h3 className="text-lg font-semibold text-gray-800">Treatment Records</h3>
          <div className="w-full sm:w-64">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search by Tag ID, name, diagnosis..."
            />
          </div>
        </div>

        <Table>
          <TableHead>
            <TableHeader>Date</TableHeader>
            <TableHeader>Animal</TableHeader>
            <TableHeader>Type</TableHeader>
            <TableHeader>Diagnosis</TableHeader>
            <TableHeader>Duration</TableHeader>
            <TableHeader>Cost</TableHeader>
            <TableHeader>Status</TableHeader>
            <TableHeader className="text-right">Actions</TableHeader>
          </TableHead>
          <TableBody>
            {filteredTreatments.length === 0 ? (
              <TableEmpty
                message="No treatment records found"
                colSpan={8}
              />
            ) : (
              filteredTreatments.map((treatment) => (
                <TableRow key={getId(treatment)}>
                  <TableCell>
                    <span className="text-sm">{formatDate(treatment.date)}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                        <GiSheep className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{treatment.animalTagId}</p>
                        <p className="text-xs text-gray-500">{treatment.animalName}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={treatment.type === 'Treatment' ? 'info' : 'warning'}>
                      {treatment.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{treatment.diagnosis}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{treatment.duration || '-'}</span>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-emerald-600">
                      {formatCurrency(treatment.totalAmount || 0)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={isCured(treatment) ? 'success' : 'danger'}>
                      {isCured(treatment) ? 'Cured' : 'Under Treatment'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      {!isCured(treatment) && (
                        <button
                          onClick={() => markAsCured(treatment)}
                          className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Mark as Cured"
                        >
                          <HiOutlineCheck className="w-5 h-5" />
                        </button>
                      )}
                      <button
                        onClick={() => setViewModal({ open: true, data: treatment })}
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <HiOutlineEye className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => openModal(treatment)}
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <HiOutlinePencil className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setDeleteModal({ open: true, item: treatment })}
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

      {/* Treatment Form Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={isEdit ? 'Edit Treatment' : 'New Treatment'}
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
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
            <div className="space-y-2">
              <SearchInput
                value={animalSearch}
                onChange={setAnimalSearch}
                placeholder={animalSearchLoading ? 'Searching…' : 'Search Tag ID / name / EID...'}
              />
              <Select
                label="Animal (Tag ID)"
                name="animalId"
                value={formData.animalId}
                onChange={handleChange}
                options={animalOptions}
                placeholder={animalOptions.length === 0 ? 'No matching animals' : 'Select animal'}
                error={errors.animalId}
                required
              />
            </div>
          </div>

          <Textarea
            label="Findings"
            name="findings"
            value={formData.findings}
            onChange={handleChange}
            placeholder="Describe the findings/symptoms..."
            rows={2}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Type"
              name="type"
              value={formData.type}
              onChange={handleChange}
              options={treatmentTypes.map(t => ({ value: t, label: t }))}
              error={errors.type}
              required
            />
            <Select
              label="Diagnosis"
              name="diagnosis"
              value={formData.diagnosis}
              onChange={handleChange}
              options={diagnosisTypes.map(d => ({ value: d, label: d }))}
              placeholder="Select diagnosis"
              error={errors.diagnosis}
              required
            />
          </div>

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
                    value: getId(m),
                    label: `${m.productName} (Stock: ${m.currentQty ?? 0} ${m.unit}) - ${formatCurrency(m.openingRatePerUnit || 0)}/${m.unit}`
                  }))}
                  placeholder="Select medicine"
                />
              </div>
              <div className="w-24">
                <Select
                  name="unit"
                  value={selectedMedicine.unit}
                  onChange={handleMedicineChange}
                  options={[
                    { value: 'ml', label: 'ml' },
                    { value: 'cc', label: 'cc' },
                    { value: 'nos', label: 'nos' }
                  ]}
                />
              </div>
              <div className="w-24">
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
          </div>

          {/* Selected Medicines Table */}
          {formData.medicines.length > 0 && (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Medicine</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Rate (auto)</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Unit</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Quantity</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Total (auto)</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {formData.medicines.map((med, index) => (
                    <tr key={index}>
                      <td className="px-4 py-2 text-sm font-medium">{med.name}</td>
                      <td className="px-4 py-2 text-sm">{formatCurrency(med.rate)}</td>
                      <td className="px-4 py-2 text-sm">{med.unit}</td>
                      <td className="px-4 py-2 text-sm">{med.quantity}</td>
                      <td className="px-4 py-2 text-sm font-medium text-emerald-600">{formatCurrency(med.total)}</td>
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
                    <td colSpan={4} className="px-4 py-2 text-sm font-semibold text-right">Total Amount (auto):</td>
                    <td colSpan={2} className="px-4 py-2 text-sm font-bold text-emerald-600">
                      {formatCurrency(totalMedicineAmount)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Duration"
              name="duration"
              value={formData.duration}
              onChange={handleChange}
              placeholder="e.g., 5 days, 1 week"
            />
            <Select
              label="Cured"
              name="cured"
              value={formData.cured}
              onChange={handleChange}
              options={[
                { value: 'Yes', label: 'Yes' },
                { value: 'No', label: 'No' }
              ]}
            />
          </div>

          <Textarea
            label="Comments"
            name="comments"
            value={formData.comments}
            onChange={handleChange}
            placeholder="Additional notes..."
            rows={3}
          />

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {isEdit ? 'Update Treatment' : 'Record Treatment'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Details Modal */}
      <Modal
        isOpen={viewModal.open}
        onClose={() => setViewModal({ open: false, data: null })}
        title="Treatment Details"
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
                <p className="text-sm text-gray-500">Animal</p>
                <p className="font-medium">{viewModal.data.tagId} - {viewModal.data.animalName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Type</p>
                <Badge variant="info">{viewModal.data.type}</Badge>
              </div>
              <div>
                <p className="text-sm text-gray-500">Diagnosis</p>
                <p className="font-medium">{viewModal.data.diagnosis}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Duration</p>
                <p className="font-medium">{viewModal.data.duration || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <Badge variant={isCured(viewModal.data) ? 'success' : 'danger'}>
                  {isCured(viewModal.data) ? 'Cured' : 'Under Treatment'}
                </Badge>
              </div>
            </div>

            {viewModal.data.findings && (
              <div>
                <p className="text-sm text-gray-500">Findings</p>
                <p className="text-gray-700">{viewModal.data.findings}</p>
              </div>
            )}
            
            {viewModal.data.medicines?.length > 0 && (
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
                      {viewModal.data.medicines.map((med, i) => (
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
            )}

            <div>
              <p className="text-sm text-gray-500">Total Cost</p>
              <p className="text-xl font-bold text-emerald-600">{formatCurrency(viewModal.data.totalAmount || 0)}</p>
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
        title="Delete Treatment Record"
        message="Are you sure you want to delete this treatment record? This action cannot be undone."
        confirmText="Delete"
        loading={deleting}
      />
    </div>
  );
};

export default Treatment;
