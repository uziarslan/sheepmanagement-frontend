import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  HiOutlinePlus,
  HiOutlineEye,
  HiOutlineTrash,
  HiOutlinePencil
} from 'react-icons/hi';
import { GiSheep, GiScissors } from 'react-icons/gi';
import { animalAPI, employeeAPI, healthAPI, penAPI } from '../../services/api';
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
import { shearingTypes } from '../../data/mockData';

const WOOL_QUALITIES = ['Excellent', 'Good', 'Average', 'Poor'];

const Shearing = () => {
  const [shearingRecords, setShearingRecords] = useState([]);
  const [animals, setAnimals] = useState([]);
  const [searchedAnimals, setSearchedAnimals] = useState([]);
  const [animalSearchLoading, setAnimalSearchLoading] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [pens, setPens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [animalSearch, setAnimalSearch] = useState('');

  // Scope / multi-animal state
  const [scope, setScope] = useState('Individual');
  const [selectedAnimalIds, setSelectedAnimalIds] = useState([]);
  const [penId, setPenId] = useState('');
  const [penAnimals, setPenAnimals] = useState([]);
  const [penLoading, setPenLoading] = useState(false);
  const [filterPenId, setFilterPenId] = useState('');

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
    shearingType: '',
    woolWeight: '',
    woolQuality: 'Good',
    cost: '',
    comments: ''
  });

  const [errors, setErrors] = useState({});

  const getId = (item) => item?._id ?? item?.id;
  const getPenLabel = (pen) => pen?.name || pen?.penName || pen?.penNumber || 'Unnamed Pen';
  const getAnimalPenId = (animal) => {
    const pen = animal?.pen ?? animal?.penId;
    if (pen && typeof pen === 'object') return pen._id || pen.id;
    return pen;
  };

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
      const [animalsRes, employeesRes, shearingRes, pensRes] = await Promise.all([
        animalAPI.getAll({ limit: 100, sort: 'tagId' }),
        employeeAPI.getAll(),
        healthAPI.getShearingRecords(),
        penAPI.getAll({ limit: 100, sort: 'name' })
      ]);

      if (animalsRes.success) setAnimals(animalsRes.data.filter(a => a.status === 'Active'));
      if (employeesRes.success) setEmployees(employeesRes.data.filter(e => e.status === 'Active'));
      if (shearingRes.success) setShearingRecords(shearingRes.data);
      if (pensRes.success) {
        const pensList = Array.isArray(pensRes.data)
          ? pensRes.data
          : (Array.isArray(pensRes.data?.data) ? pensRes.data.data : []);
        setPens(pensList);
      }
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

  const loadPenAnimals = async (id) => {
    if (!id) { setPenAnimals([]); setSelectedAnimalIds([]); return; }
    setPenLoading(true);
    try {
      const res = await animalAPI.getByPen(id);
      if (res.success) {
        const active = (res.data || []).filter(a => a.status === 'Active');
        setPenAnimals(active);
        setSelectedAnimalIds(active.map(a => getId(a)));
      }
    } catch {
      toast.error('Failed to load pen animals');
    } finally {
      setPenLoading(false);
    }
  };

  const handleAnimalToggle = (id) => {
    setSelectedAnimalIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (list) => setSelectedAnimalIds(list.map(a => getId(a)));
  const handleClearAll = () => setSelectedAnimalIds([]);

  const validate = () => {
    const newErrors = {};

    if (scope === 'Individual' || isEdit) {
      if (!formData.animalId) newErrors.animalId = 'Select an animal';
    } else {
      if (selectedAnimalIds.length === 0) newErrors.animalId = 'Select at least one animal';
    }
    if (!formData.date) newErrors.date = 'Date is required';
    if (!formData.shearingType) newErrors.shearingType = 'Shearing type is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const technicianIdKey = formData.technicianId ? String(formData.technicianId).trim() : null;
      const technician = technicianIdKey ? employees.find(e => String(getId(e)) === String(technicianIdKey)) : null;

      // Bulk submission for Multiple / Pen scope
      if (!isEdit && (scope === 'Multiple' || scope === 'Pen')) {
        const bulkData = {
          animals: selectedAnimalIds,
          date: formData.date,
          technician: technicianIdKey,
          technicianName: technician?.name || null,
          shearingType: formData.shearingType,
          woolWeight: formData.woolWeight ? parseFloat(formData.woolWeight) : 0,
          woolQuality: formData.woolQuality || 'Good',
          cost: formData.cost ? parseFloat(formData.cost) : 0,
          comments: formData.comments || null
        };
        const response = await healthAPI.bulkCreateShearingRecords(bulkData);
        if (response.success) {
          const created = response.data?.created || [];
          setShearingRecords(prev => [...created, ...prev]);
          toast.success(`${created.length} shearing record${created.length !== 1 ? 's' : ''} saved`);
          if (response.data?.errors?.length) {
            toast.error(`${response.data.errors.length} animal(s) could not be processed`);
          }
          closeModal();
        } else {
          toast.error(response.message || 'Failed to save records');
        }
        return;
      }

      // Single / edit submission
      const animalIdKey = String(formData.animalId).trim();
      const animal = animals.find(a => String(getId(a)) === String(animalIdKey));

      const shearingData = {
        animal: animalIdKey,
        animalTagId: animal?.tagId,
        animalName: animal?.name,
        date: formData.date,
        technician: technicianIdKey,
        technicianName: technician?.name || null,
        shearingType: formData.shearingType,
        woolWeight: formData.woolWeight ? parseFloat(formData.woolWeight) : 0,
        woolQuality: formData.woolQuality || 'Good',
        cost: formData.cost ? parseFloat(formData.cost) : 0,
        comments: formData.comments || null
      };

      let response;
      if (isEdit) {
        response = await healthAPI.updateShearingRecord(editId, shearingData);
        if (response.success) {
          setShearingRecords(prev => prev.map(r => getId(r) === editId ? response.data : r));
          toast.success('Shearing record updated');
        }
      } else {
        response = await healthAPI.createShearingRecord(shearingData);
        if (response.success) {
          setShearingRecords(prev => [response.data, ...prev]);
          toast.success('Shearing recorded successfully');
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
      await healthAPI.deleteShearingRecord(itemId);
      toast.success('Record deleted');
      setShearingRecords(prev => prev.filter(r => getId(r) !== itemId));
      setDeleteModal({ open: false, item: null });
    } catch (error) {
      toast.error('Failed to delete record');
    } finally {
      setDeleting(false);
    }
  };

  const openModal = (record = null) => {
    setAnimalSearch('');
    setScope('Individual');
    setSelectedAnimalIds([]);
    setPenId('');
    setPenAnimals([]);
    setFilterPenId('');
    if (record) {
      setIsEdit(true);
      setEditId(getId(record));
      const animalRef = record.animal?._id || record.animal || record.animalId;
      const techRef = record.technician?._id || record.technician || record.technicianId;
      setFormData({
        animalId: animalRef?.toString() || '',
        date: record.date?.split?.('T')?.[0] || record.date,
        technicianId: techRef?.toString() || '',
        shearingType: record.shearingType || '',
        woolWeight: record.woolWeight?.toString() || '',
        woolQuality: record.woolQuality || 'Good',
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
        shearingType: '',
        woolWeight: '',
        woolQuality: 'Good',
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
    setAnimalSearch('');
    setScope('Individual');
    setSelectedAnimalIds([]);
    setPenId('');
    setPenAnimals([]);
    setFilterPenId('');
    setFormData({
      animalId: '',
      date: new Date().toISOString().split('T')[0],
      technicianId: '',
      shearingType: '',
      woolWeight: '',
      woolQuality: 'Good',
      cost: '',
      comments: ''
    });
    setErrors({});
  };

  const filteredRecords = shearingRecords.filter(r =>
    r.tagId?.toLowerCase().includes(search.toLowerCase()) ||
    r.animalName?.toLowerCase().includes(search.toLowerCase()) ||
    r.shearingType?.toLowerCase().includes(search.toLowerCase())
  );

  const animalOptionsSource = animalSearch.trim() ? searchedAnimals : animals;
  const filteredAnimals = animalOptionsSource
    .filter(a => a.status === 'Active')
    .sort((a, b) => String(a.tagId || '').localeCompare(String(b.tagId || '')));
  const multipleScopeAnimals = filteredAnimals
    .filter(a => !filterPenId || String(getAnimalPenId(a)) === String(filterPenId));

  // Stats
  const totalCost = shearingRecords.reduce((sum, r) => sum + (r.cost || 0), 0);
  const totalWool = shearingRecords.reduce((sum, r) => sum + (r.woolWeight || 0), 0);
  const thisMonthRecords = shearingRecords.filter(r => {
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
        title="Shearing"
        subtitle="Record and manage shearing (trimming) procedures"
        breadcrumbs={[
          { label: 'Health Management' },
          { label: 'Shearing' }
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
                <p className="text-2xl font-bold mt-1">{shearingRecords.length}</p>
              </div>
              <GiScissors className="w-8 h-8 text-blue-200" />
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
            <p className="text-purple-100 text-sm">Total Wool (kg)</p>
            <p className="text-2xl font-bold mt-1">{totalWool.toFixed(1)}</p>
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
          <h3 className="text-lg font-semibold text-gray-800">Shearing Records</h3>
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
            <TableHeader>Shearing Type</TableHeader>
            <TableHeader>Technician</TableHeader>
            <TableHeader>Wool (kg)</TableHeader>
            <TableHeader>Quality</TableHeader>
            <TableHeader>Cost</TableHeader>
            <TableHeader className="text-right">Actions</TableHeader>
          </TableHead>
          <TableBody>
            {filteredRecords.length === 0 ? (
              <TableEmpty
                message="No shearing records found"
                colSpan={8}
              />
            ) : (
              filteredRecords.map((record) => (
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
                        <p className="font-medium text-sm">{record.tagId || record.animalTagId}</p>
                        <p className="text-xs text-gray-500">{record.animalName}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="warning">{record.shearingType}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{record.technicianName || '-'}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-medium">{record.woolWeight || 0} kg</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={
                      record.woolQuality === 'Excellent' ? 'success' :
                      record.woolQuality === 'Good' ? 'info' :
                      record.woolQuality === 'Average' ? 'warning' : 'danger'
                    }>
                      {record.woolQuality || '-'}
                    </Badge>
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
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Form Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={isEdit ? 'Edit Shearing Record' : 'New Shearing Record'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Scope selector — hidden when editing */}
          {!isEdit && (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Apply To</label>
              <div className="flex rounded-xl border border-gray-200 overflow-hidden">
                {[
                  { key: 'Individual', label: 'Individual Animal' },
                  { key: 'Multiple', label: 'Multiple Animals' },
                  { key: 'Pen', label: 'Pen Wide' }
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setScope(key);
                      setSelectedAnimalIds([]);
                      setPenId('');
                      setPenAnimals([]);
                      setFilterPenId('');
                      setAnimalSearch('');
                      setErrors(prev => ({ ...prev, animalId: '' }));
                    }}
                    className={`flex-1 py-2 text-sm font-medium transition-colors ${
                      scope === key
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Individual animal selector */}
          {(scope === 'Individual' || isEdit) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  options={filteredAnimals.map(a => ({
                    value: getId(a),
                    label: `${a.tagId} - ${a.name || ''}`.trim()
                  }))}
                  placeholder={filteredAnimals.length === 0 ? 'No matching animals' : 'Select animal'}
                  error={errors.animalId}
                  required
                />
              </div>
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
          )}

          {/* Multiple Animals selector */}
          {!isEdit && scope === 'Multiple' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Date"
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  error={errors.date}
                  required
                />
                <Select
                  label="Filter by Pen (optional)"
                  value={filterPenId}
                  onChange={e => setFilterPenId(e.target.value)}
                  options={pens
                    .map(p => ({ value: getId(p), label: getPenLabel(p) }))
                    .filter(p => p.value && p.label)}
                  placeholder="All pens"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">
                    Select Animals
                    {errors.animalId && <span className="text-red-500 ml-2 text-xs">{errors.animalId}</span>}
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleSelectAll(multipleScopeAnimals)}
                      className="text-xs text-emerald-600 hover:underline"
                    >
                      Select All
                    </button>
                    <span className="text-gray-300">|</span>
                    <button type="button" onClick={handleClearAll} className="text-xs text-red-500 hover:underline">
                      Clear
                    </button>
                  </div>
                </div>
                <SearchInput
                  value={animalSearch}
                  onChange={setAnimalSearch}
                  placeholder={animalSearchLoading ? 'Searching...' : 'Search animals...'}
                  className="mb-2"
                />
                <div className="border border-gray-200 rounded-xl max-h-48 overflow-y-auto divide-y divide-gray-100">
                  {(() => {
                    const list = multipleScopeAnimals;
                    if (list.length === 0) return (
                      <p className="text-sm text-gray-400 text-center py-4">No animals found</p>
                    );
                    return list.map(a => {
                      const id = getId(a);
                      const checked = selectedAnimalIds.includes(id);
                      return (
                        <label key={id} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => handleAnimalToggle(id)}
                            className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                          />
                          <span className="text-sm">
                            <span className="font-medium">{a.tagId}</span>
                            {a.name && <span className="text-gray-500"> - {a.name}</span>}
                          </span>
                        </label>
                      );
                    });
                  })()}
                </div>
                <p className="text-xs text-gray-500 mt-1">{selectedAnimalIds.length} animal(s) selected</p>
              </div>
            </div>
          )}

          {/* Pen Wide selector */}
          {!isEdit && scope === 'Pen' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Date"
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  error={errors.date}
                  required
                />
                <Select
                  label="Select Pen"
                  value={penId}
                  onChange={e => {
                    setPenId(e.target.value);
                    loadPenAnimals(e.target.value);
                  }}
                  options={pens
                    .map(p => ({ value: getId(p), label: getPenLabel(p) }))
                    .filter(p => p.value && p.label)}
                  placeholder="Choose a pen"
                  error={errors.animalId && !penId ? errors.animalId : ''}
                />
              </div>
              {penId && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">
                      Animals in Pen
                      {errors.animalId && <span className="text-red-500 ml-2 text-xs">{errors.animalId}</span>}
                    </label>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => handleSelectAll(penAnimals)} className="text-xs text-emerald-600 hover:underline">
                        Select All
                      </button>
                      <span className="text-gray-300">|</span>
                      <button type="button" onClick={handleClearAll} className="text-xs text-red-500 hover:underline">
                        Clear
                      </button>
                    </div>
                  </div>
                  {penLoading ? (
                    <p className="text-sm text-gray-400 text-center py-4">Loading animals...</p>
                  ) : (
                    <div className="border border-gray-200 rounded-xl max-h-48 overflow-y-auto divide-y divide-gray-100">
                      {penAnimals.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-4">No active animals in this pen</p>
                      ) : penAnimals.map(a => {
                        const id = getId(a);
                        const checked = selectedAnimalIds.includes(id);
                        return (
                          <label key={id} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => handleAnimalToggle(id)}
                              className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                            />
                            <span className="text-sm">
                              <span className="font-medium">{a.tagId}</span>
                              {a.name && <span className="text-gray-500"> - {a.name}</span>}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-1">{selectedAnimalIds.length} animal(s) selected</p>
                </div>
              )}
            </div>
          )}

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
              label="Shearing Type"
              name="shearingType"
              value={formData.shearingType}
              onChange={handleChange}
              options={shearingTypes.map(t => ({ value: t, label: t }))}
              placeholder="Select shearing type"
              error={errors.shearingType}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Wool Weight (kg)"
              type="number"
              name="woolWeight"
              value={formData.woolWeight}
              onChange={handleChange}
              placeholder="e.g. 2.5"
              step="0.1"
              min="0"
            />
            <Select
              label="Wool Quality"
              name="woolQuality"
              value={formData.woolQuality}
              onChange={handleChange}
              options={WOOL_QUALITIES.map(q => ({ value: q, label: q }))}
              placeholder="Select quality"
            />
            <Input
              label="Cost"
              type="number"
              name="cost"
              value={formData.cost}
              onChange={handleChange}
              placeholder="Enter cost"
              prefix="Rs."
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

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {isEdit ? 'Update Record' : (scope === 'Individual' ? 'Save Record' : `Save ${selectedAnimalIds.length || ''} Record${selectedAnimalIds.length !== 1 ? 's' : ''}`)}
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Details Modal */}
      <Modal
        isOpen={viewModal.open}
        onClose={() => setViewModal({ open: false, data: null })}
        title="Shearing Details"
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
                <p className="font-medium">{viewModal.data.tagId || viewModal.data.animalTagId} - {viewModal.data.animalName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Technician</p>
                <p className="font-medium">{viewModal.data.technicianName || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Shearing Type</p>
                <Badge variant="warning">{viewModal.data.shearingType}</Badge>
              </div>
              <div>
                <p className="text-sm text-gray-500">Wool Weight</p>
                <p className="font-medium">{viewModal.data.woolWeight || 0} kg</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Wool Quality</p>
                <Badge variant={
                  viewModal.data.woolQuality === 'Excellent' ? 'success' :
                  viewModal.data.woolQuality === 'Good' ? 'info' :
                  viewModal.data.woolQuality === 'Average' ? 'warning' : 'danger'
                }>
                  {viewModal.data.woolQuality || '-'}
                </Badge>
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
        title="Delete Shearing Record"
        message="Are you sure you want to delete this record? This action cannot be undone."
        confirmText="Delete"
        loading={deleting}
      />
    </div>
  );
};

export default Shearing;
