import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  HiOutlinePlus,
  HiOutlineEye,
  HiOutlineTrash,
  HiOutlinePencil
} from 'react-icons/hi';
import { GiSheep, GiFootprint } from 'react-icons/gi';
import { animalAPI, employeeAPI, healthAPI } from '../../services/mockApi';
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
import { hoofDiagnosis } from '../../data/mockData';

const HoofTrimming = () => {
  const [hoofRecords, setHoofRecords] = useState([]);
  const [animals, setAnimals] = useState([]);
  const [employees, setEmployees] = useState([]);
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
    animalId: '',
    date: new Date().toISOString().split('T')[0],
    technicianId: '',
    diagnosis: '',
    hoofDetails: {
      frontLeft: { condition: '', treated: false },
      frontRight: { condition: '', treated: false },
      backLeft: { condition: '', treated: false },
      backRight: { condition: '', treated: false }
    },
    cost: '',
    comments: ''
  });

  const [errors, setErrors] = useState({});

  // Helper to get id from item (supports both _id and id)
  const getId = (item) => item?._id ?? item?.id;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [animalsRes, employeesRes, hoofRes] = await Promise.all([
        animalAPI.getAll(),
        employeeAPI.getAll(),
        healthAPI.getHoofRecords()
      ]);
      
      if (animalsRes.success) setAnimals(animalsRes.data.filter(a => a.status === 'Active'));
      if (employeesRes.success) setEmployees(employeesRes.data.filter(e => e.status === 'Active'));
      if (hoofRes.success) setHoofRecords(hoofRes.data);
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

  const handleHoofChange = (hoof, field, value) => {
    setFormData(prev => ({
      ...prev,
      hoofDetails: {
        ...prev.hoofDetails,
        [hoof]: {
          ...prev.hoofDetails[hoof],
          [field]: field === 'treated' ? value : value
        }
      }
    }));
  };

  const validate = () => {
    const newErrors = {};
    
    if (!formData.animalId) newErrors.animalId = 'Select an animal';
    if (!formData.date) newErrors.date = 'Date is required';
    if (!formData.diagnosis) newErrors.diagnosis = 'Diagnosis is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const animalIdKey = String(formData.animalId).trim();
      const technicianIdKey = formData.technicianId ? String(formData.technicianId).trim() : null;
      const animal = animals.find(a => String(getId(a)) === String(animalIdKey));
      const technician = technicianIdKey ? employees.find(e => String(getId(e)) === String(technicianIdKey)) : null;

      // Backend expects hoofDetails as array: [{ position, condition, trimmed, notes }]
      // position: 'Front Left' | 'Front Right' | 'Rear Left' | 'Rear Right'
      const positionMap = {
        frontLeft: 'Front Left',
        frontRight: 'Front Right',
        backLeft: 'Rear Left',
        backRight: 'Rear Right'
      };
      const validConditions = ['Normal', 'Mild Issue', 'Moderate Issue', 'Severe Issue'];
      const hoofDetailsArray = Object.entries(formData.hoofDetails || {}).map(([key, h]) => {
        const condStr = String(h.condition || '').trim();
        const condition = validConditions.includes(condStr) ? condStr : 'Normal';
        const notes = condStr && !validConditions.includes(condStr) ? condStr || null : null;
        return {
          position: positionMap[key] || key,
          condition,
          trimmed: Boolean(h.treated),
          notes: notes || null
        };
      });

      const hoofData = {
        animal: animalIdKey,
        animalTagId: animal?.tagId,
        animalName: animal?.name,
        date: formData.date,
        technician: technicianIdKey,
        technicianName: technician?.name || null,
        diagnosis: formData.diagnosis,
        hoofDetails: hoofDetailsArray,
        cost: formData.cost ? parseFloat(formData.cost) : 0,
        comments: formData.comments || null
      };

      let response;
      if (isEdit) {
        response = await healthAPI.updateHoofRecord(editId, hoofData);
        if (response.success) {
          setHoofRecords(prev => prev.map(h => getId(h) === editId ? response.data : h));
          toast.success('Hoof trimming record updated');
        }
      } else {
        response = await healthAPI.createHoofRecord(hoofData);
        if (response.success) {
          setHoofRecords(prev => [response.data, ...prev]);
          toast.success('Hoof trimming recorded successfully');
        }
      }
      
      closeModal();
    } catch (error) {
      toast.error(error.message || 'Failed to save record');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.item) return;
    const itemId = getId(deleteModal.item);
    setDeleting(true);
    try {
      await healthAPI.deleteHoofRecord(itemId);
      toast.success('Record deleted');
      setHoofRecords(prev => prev.filter(h => getId(h) !== itemId));
      setDeleteModal({ open: false, item: null });
    } catch (error) {
      toast.error('Failed to delete record');
    } finally {
      setDeleting(false);
    }
  };

  const openModal = (record = null) => {
    if (record) {
      setIsEdit(true);
      setEditId(getId(record));
      // Backend uses 'animal' and 'technician'; hoofDetails is array, form uses object
      const animalRef = record.animal?._id || record.animal || record.animalId;
      const techRef = record.technician?._id || record.technician || record.technicianId;
      const defaultHoofObj = {
        frontLeft: { condition: '', treated: false },
        frontRight: { condition: '', treated: false },
        backLeft: { condition: '', treated: false },
        backRight: { condition: '', treated: false }
      };
      const posToKey = { 'Front Left': 'frontLeft', 'Front Right': 'frontRight', 'Rear Left': 'backLeft', 'Rear Right': 'backRight' };
      const hoofDetailsObj = Array.isArray(record.hoofDetails)
        ? record.hoofDetails.reduce((acc, h) => {
            const key = posToKey[h.position];
            if (key) acc[key] = { condition: h.condition || '', treated: Boolean(h.trimmed) };
            return acc;
          }, { ...defaultHoofObj })
        : (record.hoofDetails || defaultHoofObj);
      setFormData({
        animalId: animalRef?.toString() || '',
        date: record.date?.split?.('T')?.[0] || record.date,
        technicianId: techRef?.toString() || '',
        diagnosis: record.diagnosis,
        hoofDetails: hoofDetailsObj,
        cost: record.cost?.toString() || '',
        comments: record.comments || ''
      });
    } else {
      setIsEdit(false);
      setEditId(null);
      setFormData({
        animalId: '',
        date: new Date().toISOString().split('T')[0],
        technicianId: '',
        diagnosis: '',
        hoofDetails: {
          frontLeft: { condition: '', treated: false },
          frontRight: { condition: '', treated: false },
          backLeft: { condition: '', treated: false },
          backRight: { condition: '', treated: false }
        },
        cost: '',
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
    setFormData({
      animalId: '',
      date: new Date().toISOString().split('T')[0],
      technicianId: '',
      diagnosis: '',
      hoofDetails: {
        frontLeft: { condition: '', treated: false },
        frontRight: { condition: '', treated: false },
        backLeft: { condition: '', treated: false },
        backRight: { condition: '', treated: false }
      },
      cost: '',
      comments: ''
    });
    setErrors({});
  };

  const filteredRecords = hoofRecords.filter(r =>
    r.tagId?.toLowerCase().includes(search.toLowerCase()) ||
    r.animalName?.toLowerCase().includes(search.toLowerCase()) ||
    r.diagnosis?.toLowerCase().includes(search.toLowerCase())
  );

  const hoofLabels = {
    frontLeft: 'Front Left',
    frontRight: 'Front Right',
    backLeft: 'Back Left',
    backRight: 'Back Right'
  };

  // Stats
  const totalCost = hoofRecords.reduce((sum, r) => sum + (r.cost || 0), 0);
  const thisMonthRecords = hoofRecords.filter(r => {
    const recordDate = new Date(r.date);
    const now = new Date();
    return recordDate.getMonth() === now.getMonth() && 
           recordDate.getFullYear() === now.getFullYear();
  }).length;

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hoof Trimming"
        subtitle="Record and manage hoof trimming procedures"
        breadcrumbs={[
          { label: 'Health Management' },
          { label: 'Hoof Trimming' }
        ]}
        action={
          <Button icon={HiOutlinePlus} onClick={() => openModal()}>
            New Record
          </Button>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600">
          <div className="text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Total Records</p>
                <p className="text-2xl font-bold mt-1">{hoofRecords.length}</p>
              </div>
              <GiFootprint className="w-8 h-8 text-blue-200" />
            </div>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600">
          <div className="text-white">
            <p className="text-emerald-100 text-sm">This Month</p>
            <p className="text-2xl font-bold mt-1">{thisMonthRecords}</p>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500 to-purple-600">
          <div className="text-white">
            <p className="text-purple-100 text-sm">Animals Treated</p>
            <p className="text-2xl font-bold mt-1">
              {new Set(hoofRecords.map(r => r.animalId)).size}
            </p>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500 to-orange-600">
          <div className="text-white">
            <p className="text-orange-100 text-sm">Total Cost</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(totalCost)}</p>
          </div>
        </Card>
      </div>

      {/* Records List */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h3 className="text-lg font-semibold text-gray-800">Hoof Trimming Records</h3>
          <div className="w-full sm:w-64">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search by Tag ID, name..."
            />
          </div>
        </div>

        <Table>
          <TableHead>
            <TableHeader>Date</TableHeader>
            <TableHeader>Animal</TableHeader>
            <TableHeader>Diagnosis</TableHeader>
            <TableHeader>Technician</TableHeader>
            <TableHeader>Hooves Treated</TableHeader>
            <TableHeader>Cost</TableHeader>
            <TableHeader className="text-right">Actions</TableHeader>
          </TableHead>
          <TableBody>
            {filteredRecords.length === 0 ? (
              <TableEmpty
                message="No hoof trimming records found"
                colSpan={7}
              />
            ) : (
              filteredRecords.map((record) => {
                const details = record.hoofDetails;
                const treatedCount = Array.isArray(details)
                  ? (details.filter(h => h.trimmed) || []).length
                  : Object.values(details || {}).filter(h => h.treated).length;
                
                return (
                  <TableRow key={getId(record)}>
                    <TableCell>
                      <span className="text-sm">{formatDate(record.date)}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                          <GiSheep className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{record.tagId}</p>
                          <p className="text-xs text-gray-500">{record.animalName}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="warning">{record.diagnosis}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{record.technicianName || '-'}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {[...Array(4)].map((_, i) => (
                          <div
                            key={i}
                            className={`w-2 h-2 rounded-full ${
                              i < treatedCount ? 'bg-emerald-500' : 'bg-gray-200'
                            }`}
                          />
                        ))}
                        <span className="text-sm text-gray-500 ml-1">{treatedCount}/4</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-emerald-600">
                        {formatCurrency(record.cost || 0)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setViewModal({ open: true, data: record })}
                          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <HiOutlineEye className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => openModal(record)}
                          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <HiOutlinePencil className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => setDeleteModal({ open: true, item: record })}
                          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <HiOutlineTrash className="w-5 h-5" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Form Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={isEdit ? 'Edit Hoof Trimming Record' : 'New Hoof Trimming Record'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Animal (Tag ID)"
              name="animalId"
              value={formData.animalId}
              onChange={handleChange}
              options={animals.map(a => ({
                value: getId(a),
                label: `${a.tagId} - ${a.name}`
              }))}
              placeholder="Select animal"
              error={errors.animalId}
              required
            />
            <Input
              label="Date"
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              error={errors.date}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Technician"
              name="technicianId"
              value={formData.technicianId}
              onChange={handleChange}
              options={employees.map(e => ({
                value: getId(e),
                label: `${e.name} - ${e.designation}`
              }))}
              placeholder="Select technician"
            />
            <Select
              label="Diagnosis"
              name="diagnosis"
              value={formData.diagnosis}
              onChange={handleChange}
              options={hoofDiagnosis.map(d => ({ value: d, label: d }))}
              placeholder="Select diagnosis"
              error={errors.diagnosis}
              required
            />
          </div>

          {/* Hoof Details */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-3 block">
              Hoof Details (All Four Hooves)
            </label>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(hoofLabels).map(([key, label]) => (
                <div key={key} className="p-4 border border-gray-200 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium text-sm">{label}</span>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.hoofDetails[key].treated}
                        onChange={(e) => handleHoofChange(key, 'treated', e.target.checked)}
                        className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                      />
                      <span className="text-xs text-gray-500">Treated</span>
                    </label>
                  </div>
                  <Input
                    placeholder="Condition/Notes"
                    value={formData.hoofDetails[key].condition}
                    onChange={(e) => handleHoofChange(key, 'condition', e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>

          <Input
            label="Cost"
            type="number"
            name="cost"
            value={formData.cost}
            onChange={handleChange}
            placeholder="Enter cost"
            prefix="Rs."
          />

          <Textarea
            label="Comments"
            name="comments"
            value={formData.comments}
            onChange={handleChange}
            placeholder="Additional notes..."
            rows={3}
          />

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {isEdit ? 'Update Record' : 'Save Record'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Details Modal */}
      <Modal
        isOpen={viewModal.open}
        onClose={() => setViewModal({ open: false, data: null })}
        title="Hoof Trimming Details"
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
                <p className="text-sm text-gray-500">Technician</p>
                <p className="font-medium">{viewModal.data.technicianName || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Diagnosis</p>
                <Badge variant="warning">{viewModal.data.diagnosis}</Badge>
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-3">Hoof Details</p>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(hoofLabels).map(([key, label]) => {
                  const details = viewModal.data.hoofDetails;
                  const positionForLabel = { 'Front Left': 'Front Left', 'Front Right': 'Front Right', 'Back Left': 'Rear Left', 'Back Right': 'Rear Right' };
                  const hoof = Array.isArray(details)
                    ? details.find(h => h.position === positionForLabel[label] || h.position === label)
                    : details?.[key];
                  const treated = hoof?.trimmed ?? hoof?.treated;
                  return (
                    <div 
                      key={key} 
                      className={`p-3 rounded-lg border ${
                        treated 
                          ? 'border-emerald-200 bg-emerald-50' 
                          : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{label}</span>
                        {treated && (
                          <Badge variant="success" className="text-xs">Treated</Badge>
                        )}
                      </div>
                      {hoof?.condition && (
                        <p className="text-sm text-gray-600 mt-1">{hoof.condition}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-500">Cost</p>
              <p className="text-xl font-bold text-emerald-600">
                {formatCurrency(viewModal.data.cost || 0)}
              </p>
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
        title="Delete Hoof Trimming Record"
        message="Are you sure you want to delete this record? This action cannot be undone."
        confirmText="Delete"
        loading={deleting}
      />
    </div>
  );
};

export default HoofTrimming;
