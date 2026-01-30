import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  HiOutlineArrowLeft,
  HiOutlineArrowRight,
  HiOutlineCheck,
  HiOutlineSwitchHorizontal
} from 'react-icons/hi';
import { GiSheep } from 'react-icons/gi';
import { animalAPI, penAPI } from '../../services/mockApi';
import { filterBySearch } from '../../utils/helpers';
import {
  PageHeader,
  Card,
  Button,
  SearchInput,
  Badge
} from '../../components/common';
import { PageLoader } from '../../components/common/Spinner';

const MoveToPen = () => {
  const navigate = useNavigate();
  const [animals, setAnimals] = useState([]);
  const [pens, setPens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [moving, setMoving] = useState(false);
  
  // Selection state
  const [selectedAnimal, setSelectedAnimal] = useState(null);
  const [selectedPen, setSelectedPen] = useState(null);
  
  // Search state
  const [animalSearch, setAnimalSearch] = useState('');
  const [penSearch, setPenSearch] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Request all pens (limit 100 = backend max) so Total Capacity / Available Spots use actual DB values
      const [animalsRes, pensRes] = await Promise.all([
        animalAPI.getAll(),
        penAPI.getAll({ limit: 100 })
      ]);
      if (animalsRes.success) setAnimals(animalsRes.data.filter(a => a.status === 'Active'));
      if (pensRes.success) setPens(pensRes.data);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const getId = (item) => item?._id ?? item?.id;
  const getAnimalPenId = (animal) => {
    const pen = animal?.pen ?? animal?.penId;
    // pen could be a populated object { _id, name, type } or just an ID string
    if (pen && typeof pen === 'object') {
      return pen._id || pen.id;
    }
    return pen;
  };

  // Get pen name - first check if animal has populated pen object with name
  const getAnimalPenName = (animal) => {
    const pen = animal?.pen;
    // If pen is populated as object with name, use that directly
    if (pen && typeof pen === 'object' && pen.name) {
      return pen.name;
    }
    // Otherwise look up pen by ID
    const penId = getAnimalPenId(animal);
    if (penId == null) return 'Unassigned';
    const foundPen = pens.find(p => (p._id || p.id) == penId);
    return foundPen ? foundPen.name : 'Unassigned';
  };

  const getPenName = (penId) => {
    if (penId == null) return 'Unassigned';
    const pen = pens.find(p => (p._id || p.id) == penId);
    return pen ? pen.name : 'Unassigned';
  };

  const getPenById = (penId) => {
    if (penId == null) return null;
    return pens.find(p => (p._id || p.id) == penId);
  };

  // Filter animals
  const filteredAnimals = filterBySearch(animals, animalSearch, ['tagId', 'name', 'breedType']);
  
  // Filter pens (exclude current pen of selected animal)
  const selectedAnimalPenId = selectedAnimal ? getAnimalPenId(selectedAnimal) : null;
  const filteredPens = pens
    .filter(p => !selectedAnimal || (p._id || p.id) != selectedAnimalPenId)
    .filter(p => 
      penSearch === '' || 
      p.name.toLowerCase().includes(penSearch.toLowerCase()) ||
      p.type.toLowerCase().includes(penSearch.toLowerCase())
    );

  const handleMoveAnimal = async () => {
    if (!selectedAnimal || !selectedPen) {
      toast.error('Please select both an animal and a destination pen');
      return;
    }

    setMoving(true);
    try {
      const animalId = getId(selectedAnimal);
      const penId = getId(selectedPen);
      await animalAPI.update(animalId, { pen: penId });
      toast.success(`${selectedAnimal.name} moved to ${selectedPen.name}!`);
      
      // Update local state (backend uses 'pen' field)
      setAnimals(prev => prev.map(a => 
        getId(a) === animalId ? { ...a, pen: penId, penId } : a
      ));
      
      // Refetch pens so Total Capacity, Available Spots and per-pen counts reflect actual DB
      const pensRes = await penAPI.getAll({ limit: 100 });
      if (pensRes.success) setPens(pensRes.data);
      
      // Reset selections
      setSelectedAnimal(null);
      setSelectedPen(null);
    } catch (error) {
      toast.error('Failed to move animal');
    } finally {
      setMoving(false);
    }
  };

  // Use DB values: capacity and animalCount come from backend aggregation
  const getPenCapacity = (pen) => Number(pen?.capacity) || 0;
  const getPenAnimalCount = (pen) => Number(pen?.animalCount) ?? 0;
  const getPenSpotsAvailable = (pen) => Math.max(0, getPenCapacity(pen) - getPenAnimalCount(pen));

  const getPenStatusColor = (pen) => {
    const cap = getPenCapacity(pen);
    if (cap <= 0) return 'text-gray-600 bg-gray-100';
    const percentage = (getPenAnimalCount(pen) / cap) * 100;
    if (percentage >= 90) return 'text-red-600 bg-red-100';
    if (percentage >= 70) return 'text-orange-600 bg-orange-100';
    return 'text-emerald-600 bg-emerald-100';
  };

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Move Animal to Pen"
        subtitle="Transfer animals between pens easily"
        breadcrumbs={[
          { label: 'Animals', path: '/dashboard/animals' },
          { label: 'Move to Pen' }
        ]}
        action={
          <Button
            variant="ghost"
            icon={HiOutlineArrowLeft}
            onClick={() => navigate('/dashboard/animals')}
          >
            Back to List
          </Button>
        }
      />

      {/* Transfer Summary Card */}
      {(selectedAnimal || selectedPen) && (
        <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            {/* Selected Animal */}
            <div className={`flex-1 w-full lg:w-auto p-4 rounded-xl transition-all ${
              selectedAnimal ? 'bg-white shadow-sm' : 'bg-gray-100 border-2 border-dashed border-gray-300'
            }`}>
              {selectedAnimal ? (
                <div className="flex items-center space-x-4">
                  <div className="w-14 h-14 rounded-xl bg-emerald-100 flex items-center justify-center">
                    <GiSheep className="w-8 h-8 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{selectedAnimal.name}</p>
                    <p className="text-sm text-gray-500">{selectedAnimal.tagId}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Current: {getAnimalPenName(selectedAnimal)}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-500">Select an animal</p>
                </div>
              )}
            </div>

            {/* Arrow / Transfer Button */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-emerald-600 flex items-center justify-center shadow-lg">
                <HiOutlineArrowRight className="w-6 h-6 text-white" />
              </div>
              {selectedAnimal && selectedPen && (
                <Button
                  size="sm"
                  icon={HiOutlineSwitchHorizontal}
                  onClick={handleMoveAnimal}
                  loading={moving}
                >
                  Move Now
                </Button>
              )}
            </div>

            {/* Selected Pen */}
            <div className={`flex-1 w-full lg:w-auto p-4 rounded-xl transition-all ${
              selectedPen ? 'bg-white shadow-sm' : 'bg-gray-100 border-2 border-dashed border-gray-300'
            }`}>
              {selectedPen ? (
                <div className="flex items-center space-x-4">
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${getPenStatusColor(selectedPen)}`}>
                    <span className="text-lg font-bold">{getPenAnimalCount(selectedPen)}/{getPenCapacity(selectedPen)}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{selectedPen.name}</p>
                    <p className="text-sm text-gray-500">{selectedPen.type}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {getPenSpotsAvailable(selectedPen)} spots available
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-500">Select destination pen</p>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Selection Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Animals List */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Select Animal</h3>
            <Badge variant="info">{filteredAnimals.length} animals</Badge>
          </div>
          
          <div className="mb-4">
            <SearchInput
              value={animalSearch}
              onChange={setAnimalSearch}
              placeholder="Search by Tag ID, Name, or Breed..."
            />
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
            {filteredAnimals.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No animals found
              </div>
            ) : (
              filteredAnimals.map((animal) => {
                const animalId = getId(animal);
                const isSelected = getId(selectedAnimal) === animalId;
                
                return (
                  <div
                    key={animalId}
                    onClick={() => setSelectedAnimal(isSelected ? null : animal)}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      isSelected 
                        ? 'border-emerald-500 bg-emerald-50 shadow-md' 
                        : 'border-gray-200 hover:border-emerald-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                          isSelected ? 'bg-emerald-200' : 'bg-emerald-100'
                        }`}>
                          <GiSheep className={`w-6 h-6 ${isSelected ? 'text-emerald-700' : 'text-emerald-600'}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-gray-900">{animal.name}</p>
                            <Badge variant={animal.sex === 'Male' ? 'info' : 'purple'} className="text-xs">
                              {animal.sex}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-500">
                            {animal.tagId} • {animal.breedType}
                          </p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-gray-400">
                              {animal.weight} kg
                            </span>
                            <span className="text-xs text-emerald-600 font-medium">
                              {getAnimalPenName(animal)}
                            </span>
                          </div>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
                          <HiOutlineCheck className="w-5 h-5 text-white" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {/* Pens List */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Select Destination Pen</h3>
            <Badge variant="success">{filteredPens.length} pens</Badge>
          </div>
          
          <div className="mb-4">
            <SearchInput
              value={penSearch}
              onChange={setPenSearch}
              placeholder="Search pens by name or type..."
            />
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
            {filteredPens.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {selectedAnimal ? 'No other pens available' : 'No pens found'}
              </div>
            ) : (
              filteredPens.map((pen) => {
                const penId = getId(pen);
                const isSelected = getId(selectedPen) === penId;
                const capacity = getPenCapacity(pen);
                const animalCount = getPenAnimalCount(pen);
                const spotsAvailable = getPenSpotsAvailable(pen);
                const isFull = capacity > 0 && animalCount >= capacity;
                const percentage = capacity > 0 ? Math.round((animalCount / capacity) * 100) : 0;
                
                return (
                  <div
                    key={penId}
                    onClick={() => !isFull && setSelectedPen(isSelected ? null : pen)}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      isFull 
                        ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed' 
                        : isSelected 
                          ? 'border-emerald-500 bg-emerald-50 shadow-md cursor-pointer' 
                          : 'border-gray-200 hover:border-emerald-300 hover:bg-gray-50 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                          isFull ? 'bg-red-100' : getPenStatusColor(pen)
                        }`}>
                          <span className={`text-sm font-bold ${isFull ? 'text-red-600' : ''}`}>
                            {animalCount}/{capacity}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-gray-900">{pen.name}</p>
                            {isFull && (
                              <Badge variant="danger" className="text-xs">Full</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">{pen.type}</p>
                          
                          {/* Capacity Bar - based on DB animalCount/capacity */}
                          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all ${
                                percentage >= 90 ? 'bg-red-500' : 
                                percentage >= 70 ? 'bg-orange-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <p className="text-xs text-gray-400 mt-1">
                            {spotsAvailable} spots available • {percentage}% full
                          </p>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
                          <HiOutlineCheck className="w-5 h-5 text-white" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div>
            <p className="text-sm text-blue-600">Total Animals</p>
            <p className="text-2xl font-bold text-blue-800">{animals.length}</p>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
          <div>
            <p className="text-sm text-emerald-600">Total Pens</p>
            <p className="text-2xl font-bold text-emerald-800">{pens.length}</p>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <div>
            <p className="text-sm text-purple-600">Total Capacity</p>
            <p className="text-2xl font-bold text-purple-800">
              {pens.reduce((sum, p) => sum + getPenCapacity(p), 0)}
            </p>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <div>
            <p className="text-sm text-orange-600">Available Spots</p>
            <p className="text-2xl font-bold text-orange-800">
              {pens.reduce((sum, p) => sum + getPenSpotsAvailable(p), 0)}
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default MoveToPen;
