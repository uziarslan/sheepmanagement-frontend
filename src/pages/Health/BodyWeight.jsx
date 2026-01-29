import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  HiOutlinePlus,
  HiOutlineScale,
  HiOutlineTrendingUp,
  HiOutlineTrendingDown,
  HiOutlineArrowRight
} from 'react-icons/hi';
import { GiSheep } from 'react-icons/gi';
import { animalAPI, healthAPI } from '../../services/mockApi';
import { formatDate, filterBySearch } from '../../utils/helpers';
import {
  PageHeader,
  Card,
  Button,
  Input,
  Select,
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
import Modal from '../../components/common/Modal';
import { PageLoader } from '../../components/common/Spinner';

const BodyWeight = () => {
  const [animals, setAnimals] = useState([]);
  const [weightRecords, setWeightRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAnimal, setSelectedAnimal] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    animalId: '',
    date: new Date().toISOString().split('T')[0],
    weight: ''
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [animalsRes, weightsRes] = await Promise.all([
        animalAPI.getAll(),
        healthAPI.getWeightRecords()
      ]);
      
      if (animalsRes.success) setAnimals(animalsRes.data.filter(a => a.status === 'Active'));
      if (weightsRes.success) setWeightRecords(weightsRes.data);
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

  const validate = () => {
    const newErrors = {};
    
    if (!formData.animalId) newErrors.animalId = 'Select an animal';
    if (!formData.date) newErrors.date = 'Date is required';
    if (!formData.weight || parseFloat(formData.weight) <= 0) {
      newErrors.weight = 'Enter a valid weight';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const animal = animals.find(a => a.id === parseInt(formData.animalId));
      
      const weightData = {
        animalId: parseInt(formData.animalId),
        tagId: animal?.tagId,
        animalName: animal?.name,
        date: formData.date,
        weight: parseFloat(formData.weight),
        previousWeight: animal?.weight || 0
      };

      const response = await healthAPI.createWeightRecord(weightData);
      
      if (response.success) {
        // Update animal's current weight
        await animalAPI.update(animal.id, { 
          weight: parseFloat(formData.weight),
          weightDate: formData.date
        });

        // Update local state
        setAnimals(prev => prev.map(a => 
          a.id === animal.id 
            ? { ...a, weight: parseFloat(formData.weight), weightDate: formData.date }
            : a
        ));
        setWeightRecords(prev => [response.data, ...prev]);
        
        toast.success('Weight recorded successfully');
        closeModal();
      }
    } catch (error) {
      toast.error(error.message || 'Failed to record weight');
    } finally {
      setSubmitting(false);
    }
  };

  const openModal = (animal = null) => {
    setSelectedAnimal(animal);
    setFormData({
      animalId: animal?.id?.toString() || '',
      date: new Date().toISOString().split('T')[0],
      weight: ''
    });
    setErrors({});
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedAnimal(null);
    setFormData({
      animalId: '',
      date: new Date().toISOString().split('T')[0],
      weight: ''
    });
    setErrors({});
  };

  const getWeightHistory = (animalId) => {
    return weightRecords
      .filter(w => w.animalId === animalId)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  const getWeightChange = (animal) => {
    const history = getWeightHistory(animal.id);
    if (history.length < 2) return null;
    return history[0].weight - history[1].weight;
  };

  const filteredAnimals = filterBySearch(animals, search, ['tagId', 'name', 'breedType']);

  // Stats
  const avgWeight = animals.length > 0 
    ? (animals.reduce((sum, a) => sum + (a.weight || 0), 0) / animals.length).toFixed(1)
    : 0;
  const totalWeight = animals.reduce((sum, a) => sum + (a.weight || 0), 0);
  const weightedThisMonth = weightRecords.filter(w => {
    const recordDate = new Date(w.date);
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
        title="Body Weight Tracking"
        subtitle="Monitor and record animal weight periodically"
        breadcrumbs={[
          { label: 'Health Management' },
          { label: 'Body Weight' }
        ]}
        action={
          <Button icon={HiOutlinePlus} onClick={() => openModal()}>
            Record Weight
          </Button>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600">
          <div className="text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Total Animals</p>
                <p className="text-2xl font-bold mt-1">{animals.length}</p>
              </div>
              <HiOutlineScale className="w-8 h-8 text-blue-200" />
            </div>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600">
          <div className="text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm">Average Weight</p>
                <p className="text-2xl font-bold mt-1">{avgWeight} kg</p>
              </div>
              <HiOutlineTrendingUp className="w-8 h-8 text-emerald-200" />
            </div>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500 to-purple-600">
          <div className="text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Total Weight</p>
                <p className="text-2xl font-bold mt-1">{totalWeight} kg</p>
              </div>
              <HiOutlineScale className="w-8 h-8 text-purple-200" />
            </div>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500 to-orange-600">
          <div className="text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm">Weighed This Month</p>
                <p className="text-2xl font-bold mt-1">{weightedThisMonth}</p>
              </div>
              <HiOutlineTrendingUp className="w-8 h-8 text-orange-200" />
            </div>
          </div>
        </Card>
      </div>

      {/* Animals List */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h3 className="text-lg font-semibold text-gray-800">Animal Weights</h3>
          <div className="w-full sm:w-64">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search by Tag ID, name..."
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAnimals.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-500">
              No animals found
            </div>
          ) : (
            filteredAnimals.map((animal) => {
              const weightChange = getWeightChange(animal);
              const history = getWeightHistory(animal.id);
              
              return (
                <div
                  key={animal.id}
                  className="p-4 border border-gray-200 rounded-xl hover:border-emerald-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                        <GiSheep className="w-7 h-7 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{animal.name}</p>
                        <p className="text-sm text-gray-500">{animal.tagId}</p>
                      </div>
                    </div>
                    <Badge variant={animal.sex === 'Male' ? 'info' : 'purple'}>
                      {animal.sex}
                    </Badge>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-3 mb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Current Weight</p>
                        <p className="text-2xl font-bold text-gray-900">{animal.weight || 0} kg</p>
                      </div>
                      {weightChange !== null && (
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${
                          weightChange > 0 
                            ? 'bg-emerald-100 text-emerald-700'
                            : weightChange < 0
                              ? 'bg-red-100 text-red-700'
                              : 'bg-gray-100 text-gray-600'
                        }`}>
                          {weightChange > 0 ? (
                            <HiOutlineTrendingUp className="w-4 h-4" />
                          ) : weightChange < 0 ? (
                            <HiOutlineTrendingDown className="w-4 h-4" />
                          ) : (
                            <HiOutlineArrowRight className="w-4 h-4" />
                          )}
                          <span className="text-sm font-medium">
                            {weightChange > 0 ? '+' : ''}{weightChange?.toFixed(1)} kg
                          </span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Last weighed: {animal.weightDate ? formatDate(animal.weightDate) : 'Not recorded'}
                    </p>
                  </div>

                  {/* Mini History */}
                  {history.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-gray-500 mb-2">Recent History</p>
                      <div className="flex items-center gap-2 overflow-x-auto pb-1">
                        {history.slice(0, 5).map((record, i) => (
                          <div 
                            key={record.id}
                            className="flex-shrink-0 text-center px-2 py-1 bg-gray-100 rounded-lg"
                          >
                            <p className="text-sm font-medium">{record.weight}kg</p>
                            <p className="text-xs text-gray-400">{formatDate(record.date).split(',')[0]}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    fullWidth
                    icon={HiOutlinePlus}
                    onClick={() => openModal(animal)}
                  >
                    Update Weight
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </Card>

      {/* Recent Weight Records Table */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Weight Records</h3>
        <Table>
          <TableHead>
            <TableHeader>Date</TableHeader>
            <TableHeader>Animal</TableHeader>
            <TableHeader>Previous Weight</TableHeader>
            <TableHeader>New Weight</TableHeader>
            <TableHeader>Change</TableHeader>
          </TableHead>
          <TableBody>
            {weightRecords.slice(0, 10).length === 0 ? (
              <TableEmpty
                message="No weight records yet"
                colSpan={5}
              />
            ) : (
              weightRecords.slice(0, 10).map((record) => {
                const change = record.weight - (record.previousWeight || 0);
                return (
                  <TableRow key={record.id}>
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
                      <span className="text-gray-500">{record.previousWeight || 0} kg</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold">{record.weight} kg</span>
                    </TableCell>
                    <TableCell>
                      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm ${
                        change > 0 
                          ? 'bg-emerald-100 text-emerald-700'
                          : change < 0
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-600'
                      }`}>
                        {change > 0 ? (
                          <HiOutlineTrendingUp className="w-4 h-4" />
                        ) : change < 0 ? (
                          <HiOutlineTrendingDown className="w-4 h-4" />
                        ) : null}
                        <span className="font-medium">
                          {change > 0 ? '+' : ''}{change.toFixed(1)} kg
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Record Weight Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title="Record Weight"
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <Select
            label="Select Animal"
            name="animalId"
            value={formData.animalId}
            onChange={handleChange}
            options={animals.map(a => ({
              value: a.id,
              label: `${a.tagId} - ${a.name} (Current: ${a.weight || 0} kg)`
            }))}
            placeholder="Choose an animal"
            error={errors.animalId}
            required
            disabled={selectedAnimal !== null}
          />

          {formData.animalId && (
            <div className="p-4 bg-gray-50 rounded-xl">
              {(() => {
                const animal = animals.find(a => a.id === parseInt(formData.animalId));
                return animal ? (
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                      <GiSheep className="w-7 h-7 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-semibold">{animal.name}</p>
                      <p className="text-sm text-gray-500">
                        Current: {animal.weight || 0} kg • 
                        Last: {animal.weightDate ? formatDate(animal.weightDate) : 'Never'}
                      </p>
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
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
              label="Weight"
              type="number"
              name="weight"
              value={formData.weight}
              onChange={handleChange}
              placeholder="Enter weight"
              suffix="kg"
              error={errors.weight}
              required
            />
          </div>

          {formData.weight && formData.animalId && (
            <div className="p-4 bg-emerald-50 rounded-xl">
              {(() => {
                const animal = animals.find(a => a.id === parseInt(formData.animalId));
                const change = parseFloat(formData.weight) - (animal?.weight || 0);
                return (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Weight Change:</span>
                    <span className={`font-semibold ${
                      change > 0 ? 'text-emerald-600' : change < 0 ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {change > 0 ? '+' : ''}{change.toFixed(1)} kg
                    </span>
                  </div>
                );
              })()}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Record Weight
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default BodyWeight;
