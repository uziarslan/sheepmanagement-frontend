import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  HiOutlineExclamationCircle,
  HiOutlineArrowLeft
} from 'react-icons/hi';
import { GiSheep } from 'react-icons/gi';
import { animalAPI } from '../../services/api';
import { formatCurrency } from '../../utils/helpers';
import {
  PageHeader,
  Card,
  Button,
  Input,
  Badge,
  SearchInput
} from '../../components/common';
import { ConfirmDialog } from '../../components/common/Modal';
import { PageLoader } from '../../components/common/Spinner';

const DeclareAnimalDead = () => {
  const navigate = useNavigate();
  const [animals, setAnimals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnimalId, setSelectedAnimalId] = useState('');
  const [selectedAnimal, setSelectedAnimal] = useState(null);
  const [animalSearch, setAnimalSearch] = useState('');
  const [searchedAnimals, setSearchedAnimals] = useState([]);
  const [animalSearchLoading, setAnimalSearchLoading] = useState(false);
  const [deathData, setDeathData] = useState({
    deathDate: new Date().toISOString().split('T')[0],
    deathReason: ''
  });
  const [confirmModal, setConfirmModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    fetchActiveAnimals();
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
        const res = await animalAPI.getAll({ limit: 100, sort: 'tagId', search: q, status: 'Active' });
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

  const fetchActiveAnimals = async () => {
    try {
      const response = await animalAPI.getAll({ status: 'Active' });
      if (response.success) {
        setAnimals(response.data);
      }
    } catch (error) {
      toast.error('Failed to fetch animals');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setDeathData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedAnimalId) {
      toast.error('Please select an animal');
      return;
    }
    setConfirmModal(true);
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      const response = await animalAPI.declareDead(selectedAnimalId, deathData);
      if (response.success) {
        toast.success('Animal marked as dead; loss recorded in capital');
        setResult(response.data);
        setConfirmModal(false);
        // Remove the animal from the list
        setAnimals(prev => prev.filter(a => (a._id || a.id) !== selectedAnimalId));
        setSelectedAnimalId('');
        setSelectedAnimal(null);
      }
    } catch (error) {
      toast.error(error.message || 'Failed to process request');
    } finally {
      setSubmitting(false);
      setConfirmModal(false);
    }
  };

  const calculateTotalCost = (animal) => {
    if (!animal) return 0;
    return animal.totalPrice ?? (animal.purchasePrice || 0) + (animal.cost || 0);
  };

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Declare Animal Dead"
        subtitle="Mark an animal as deceased and distribute its cost among remaining animals"
        breadcrumbs={[
          { label: 'Animals', path: '/dashboard/animals' },
          { label: 'Declare Dead' }
        ]}
        action={
          <Button
            variant="outline"
            icon={HiOutlineArrowLeft}
            onClick={() => navigate('/dashboard/animals')}
          >
            Back to Animals
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form Card */}
        <Card>
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
              <HiOutlineExclamationCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Death Declaration</h3>
              <p className="text-sm text-gray-500">Select an animal to mark as deceased</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Animal Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Animal
              </label>
              <div className="mb-2">
                <SearchInput
                  value={animalSearch}
                  onChange={setAnimalSearch}
                  placeholder={animalSearchLoading ? 'Searching…' : 'Search Tag ID / name...'}
                />
              </div>
              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-xl p-2 space-y-1 bg-white">
                {animalSearch.trim() === '' && animals.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No active animals available
                  </p>
                ) : animalSearch.trim() === '' ? (
                  animals.map((animal) => (
                    <button
                      key={animal._id || animal.id}
                      type="button"
                      onClick={() => {
                        setSelectedAnimalId(animal._id || animal.id);
                        setSelectedAnimal(animal);
                        setResult(null);
                        setAnimalSearch('');
                      }}
                      className={`w-full text-left flex items-center gap-3 p-3 rounded-lg transition-colors ${
                        selectedAnimalId === (animal._id || animal.id)
                          ? 'bg-emerald-50 border border-emerald-200'
                          : 'hover:bg-gray-50 border border-transparent'
                      }`}
                    >
                      <div className="w-8 h-8 rounded bg-emerald-100 flex items-center justify-center flex-shrink-0">
                        <GiSheep className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900">{animal.tagId}</p>
                        <p className="text-xs text-gray-500">{animal.name || 'Unnamed'} • {animal.animalType}</p>
                      </div>
                    </button>
                  ))
                ) : searchedAnimals.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No animals found
                  </p>
                ) : (
                  searchedAnimals.map((animal) => (
                    <button
                      key={animal._id || animal.id}
                      type="button"
                      onClick={() => {
                        setSelectedAnimalId(animal._id || animal.id);
                        setSelectedAnimal(animal);
                        setResult(null);
                        setAnimalSearch('');
                      }}
                      className={`w-full text-left flex items-center gap-3 p-3 rounded-lg transition-colors ${
                        selectedAnimalId === (animal._id || animal.id)
                          ? 'bg-emerald-50 border border-emerald-200'
                          : 'hover:bg-gray-50 border border-transparent'
                      }`}
                    >
                      <div className="w-8 h-8 rounded bg-emerald-100 flex items-center justify-center flex-shrink-0">
                        <GiSheep className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900">{animal.tagId}</p>
                        <p className="text-xs text-gray-500">{animal.name || 'Unnamed'} • {animal.animalType}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            <Input
              label="Death Date"
              type="date"
              name="deathDate"
              value={deathData.deathDate}
              onChange={handleInputChange}
              required
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Death Reason
              </label>
              <textarea
                name="deathReason"
                value={deathData.deathReason}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                placeholder="Enter the reason for death..."
              />
            </div>

            <div className="pt-4">
              <Button
                type="submit"
                className="w-full bg-red-600 hover:bg-red-700"
                disabled={!selectedAnimalId}
              >
                Declare Dead
              </Button>
            </div>
          </form>
        </Card>

        {/* Animal Preview Card */}
        <div className="space-y-6">
          {selectedAnimal && (
            <Card>
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-16 h-16 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <GiSheep className="w-10 h-10 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    {selectedAnimal.name || 'Unnamed Animal'}
                  </h3>
                  <p className="text-gray-500">
                    <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-sm">
                      {selectedAnimal.tagId}
                    </span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500 mb-1">Type / Breed</p>
                  <p className="font-medium">{selectedAnimal.animalType}</p>
                  <p className="text-sm text-gray-600">{selectedAnimal.breedType}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500 mb-1">Sex</p>
                  <Badge variant={selectedAnimal.sex === 'Male' ? 'info' : 'purple'}>
                    {selectedAnimal.sex}
                  </Badge>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500 mb-1">Weight</p>
                  <p className="font-medium">{selectedAnimal.weight} kg</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500 mb-1">Purchase Price</p>
                  <p className="font-medium text-emerald-600">
                    {formatCurrency(selectedAnimal.purchasePrice)}
                  </p>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <h4 className="font-medium text-gray-900 mb-4">Cost Summary</h4>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Purchase Price</span>
                    <span className="font-medium">{formatCurrency(selectedAnimal.purchasePrice || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Operational Cost</span>
                    <span className="font-medium text-orange-600">{formatCurrency(selectedAnimal.cost || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm border-t pt-3 mt-3">
                    <span className="font-semibold text-gray-900">Total Cost (Recorded as Loss)</span>
                    <span className="font-bold text-red-600">
                      {formatCurrency(calculateTotalCost(selectedAnimal))}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-sm text-amber-800">
                  <strong>Note:</strong> When this animal is marked as dead, its total cost of{' '}
                  <strong>{formatCurrency(calculateTotalCost(selectedAnimal))}</strong>{' '}
                  will be recorded as <strong>Loss</strong> in Capital. No cost is distributed to other animals.
                </p>
              </div>
            </Card>
          )}

          {/* Result Card */}
          {result && (
            <Card className="border-green-200 bg-green-50">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h4 className="text-lg font-semibold text-green-800">Death Recorded</h4>
              </div>
              <div className="space-y-2 text-sm text-green-700">
                <p>Loss recorded in Capital: <strong>{formatCurrency(result.lossRecorded ?? 0)}</strong></p>
              </div>
            </Card>
          )}

          {!selectedAnimal && !result && (
            <Card className="border-dashed border-2 border-gray-200">
              <div className="text-center py-12">
                <GiSheep className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Select an animal to view details</p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmModal}
        onClose={() => setConfirmModal(false)}
        onConfirm={handleConfirm}
        title="Confirm Death Declaration"
        message={
          selectedAnimal
            ? `Are you sure you want to mark "${selectedAnimal.name || selectedAnimal.tagId}" as dead? This will record ${formatCurrency(calculateTotalCost(selectedAnimal))} as loss in Capital. This action cannot be undone.`
            : 'Are you sure you want to proceed?'
        }
        confirmText="Confirm"
        loading={submitting}
      />
    </div>
  );
};

export default DeclareAnimalDead;
