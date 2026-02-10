import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  HiOutlineSave,
  HiOutlineRefresh,
  HiOutlineFilter
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
import { PageLoader } from '../../components/common/Spinner';

const BodyConditionScore = () => {
  const [animals, setAnimals] = useState([]);
  const [bcsRecords, setBcsRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Editable BCS values
  const [editedBcs, setEditedBcs] = useState({});
  
  // Filters
  const [filters, setFilters] = useState({
    sex: '',
    bcsRange: ''
  });

  // Helper to get id from item (supports both _id and id)
  const getId = (item) => item?._id ?? item?.id;
  // Backend returns bcsScore, support bcsValue for compatibility
  const getBcsValue = (record) => record?.bcsScore ?? record?.bcsValue;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [animalsRes, bcsRes] = await Promise.all([
        animalAPI.getAll(),
        healthAPI.getBcsRecords()
      ]);
      
      if (animalsRes.success) setAnimals(animalsRes.data.filter(a => a.status === 'Active'));
      if (bcsRes.success) setBcsRecords(bcsRes.data);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleBcsChange = (animalId, value) => {
    const numValue = parseFloat(value);
    // Allow integer BCS values in 1-10 range
    if (
      value === '' ||
      (Number.isFinite(numValue) && numValue >= 1 && numValue <= 10 && Number.isInteger(numValue))
    ) {
      setEditedBcs(prev => ({ ...prev, [animalId]: value }));
    }
  };

  const saveBcs = async (animal) => {
    const animalId = getId(animal);
    const newBcs = editedBcs[animalId];
    if (!newBcs || newBcs === '') {
      toast.error('Please enter a BCS value');
      return;
    }

    setSaving(prev => ({ ...prev, [animalId]: true }));
    try {
      // Backend expects bcsScore (not bcsValue); previousBcs/previousBcsDate are calculated server-side
      const bcsData = {
        animal: animalId,
        animalTagId: animal.tagId,
        animalName: animal.name,
        date: new Date().toISOString().split('T')[0],
        bcsScore: parseFloat(newBcs)
      };

      const response = await healthAPI.createBcsRecord(bcsData);
      
      if (response.success) {
        setBcsRecords(prev => [response.data, ...prev]);
        setEditedBcs(prev => {
          const updated = { ...prev };
          delete updated[animalId];
          return updated;
        });
        toast.success(`BCS saved for ${animal.tagId}`);
      }
    } catch (error) {
      toast.error('Failed to save BCS');
    } finally {
      setSaving(prev => ({ ...prev, [animalId]: false }));
    }
  };

  // Helper to get animal ID from a BCS record (handles populated object or string)
  const getRecordAnimalId = (record) => {
    const animalRef = record?.animal;
    if (animalRef && typeof animalRef === 'object') return String(animalRef._id || animalRef.id);
    return animalRef ? String(animalRef) : record?.animalId ? String(record.animalId) : null;
  };

  const getLatestBcs = (animalId) => {
    const animalIdStr = String(animalId);
    const animalRecords = bcsRecords.filter(r => getRecordAnimalId(r) === animalIdStr);
    if (animalRecords.length === 0) return null;
    return animalRecords.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
  };

  const getPreviousBcs = (animalId) => {
    const animalIdStr = String(animalId);
    const animalRecords = bcsRecords.filter(r => getRecordAnimalId(r) === animalIdStr);
    if (animalRecords.length < 2) return null;
    const sorted = animalRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
    return sorted[1];
  };

  const calculateAge = (birthDate) => {
    if (birthDate == null || birthDate === '') return '-';
    const birth = new Date(birthDate);
    if (Number.isNaN(birth.getTime())) return '-';
    const now = new Date();
    let months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
    if (now.getDate() < birth.getDate()) months -= 1;
    if (months < 0) return '-';
    if (months < 12) return `${months} months`;
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    return remainingMonths > 0 ? `${years}y ${remainingMonths}m` : `${years} years`;
  };

  const getBcsColor = (bcs) => {
    if (!bcs) return 'bg-gray-100 text-gray-600';
    // 1-10 scale thresholds: <4 very low, 4-5 low, 5-7 optimal, 7-8 high, >8 very high
    if (bcs < 4) return 'bg-red-100 text-red-700';
    if (bcs < 5) return 'bg-orange-100 text-orange-700';
    if (bcs <= 7) return 'bg-emerald-100 text-emerald-700';
    if (bcs <= 8) return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const clearFilters = () => {
    setFilters({ sex: '', bcsRange: '' });
    setSearch('');
  };

  // Filter animals
  let filteredAnimals = filterBySearch(animals, search, ['tagId', 'name', 'breedType']);
  
  if (filters.sex) {
    filteredAnimals = filteredAnimals.filter(a => a.sex === filters.sex);
  }
  
  if (filters.bcsRange) {
    filteredAnimals = filteredAnimals.filter(a => {
      const latestBcs = getLatestBcs(getId(a));
      if (!latestBcs) return filters.bcsRange === 'none';
      
      const bcs = getBcsValue(latestBcs);
      switch (filters.bcsRange) {
        case 'low': return bcs < 5;
        case 'optimal': return bcs >= 5 && bcs <= 7;
        case 'high': return bcs > 7;
        case 'none': return false;
        default: return true;
      }
    });
  }

  // Stats
  const avgBcs = bcsRecords.length > 0
    ? (bcsRecords.reduce((sum, r) => sum + getBcsValue(r), 0) / bcsRecords.length).toFixed(2)
    : '-';
  const animalsWithBcs = new Set(bcsRecords.map(r => getRecordAnimalId(r))).size;
  const lowBcsCount = animals.filter(a => {
    const bcs = getLatestBcs(getId(a));
    return bcs && getBcsValue(bcs) < 5;
  }).length;

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Body Condition Score (BCS)"
        subtitle="Monitor and record animal body condition scores"
        breadcrumbs={[
          { label: 'Health Management' },
          { label: 'Body Condition Score' }
        ]}
        action={
          <Button
            variant="outline"
            icon={HiOutlineRefresh}
            onClick={fetchData}
          >
            Refresh
          </Button>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600">
          <div className="text-white">
            <p className="text-blue-100 text-sm">Total Animals</p>
            <p className="text-2xl font-bold mt-1">{animals.length}</p>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600">
          <div className="text-white">
            <p className="text-emerald-100 text-sm">Average BCS</p>
            <p className="text-2xl font-bold mt-1">{avgBcs}</p>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500 to-purple-600">
          <div className="text-white">
            <p className="text-purple-100 text-sm">Animals Scored</p>
            <p className="text-2xl font-bold mt-1">{animalsWithBcs}</p>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500 to-orange-600">
          <div className="text-white">
            <p className="text-orange-100 text-sm">Low BCS Alert</p>
            <p className="text-2xl font-bold mt-1">{lowBcsCount}</p>
          </div>
        </Card>
      </div>

      {/* BCS Scale Guide */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">BCS Scale Guide</h3>
        <div className="grid grid-cols-5 gap-3">
          {[
            { score: '1-2', label: 'Emaciated', color: 'bg-red-100 border-red-300 text-red-700' },
            { score: '3-4', label: 'Thin', color: 'bg-orange-100 border-orange-300 text-orange-700' },
            { score: '5-7', label: 'Ideal', color: 'bg-emerald-100 border-emerald-300 text-emerald-700' },
            { score: '8-9', label: 'Fat', color: 'bg-yellow-100 border-yellow-300 text-yellow-700' },
            { score: '10', label: 'Obese', color: 'bg-red-100 border-red-300 text-red-700' }
          ].map((item) => (
            <div key={item.score} className={`p-3 rounded-xl border-2 text-center ${item.color}`}>
              <p className="text-2xl font-bold">{item.score}</p>
              <p className="text-xs mt-1">{item.label}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Main Table */}
      <Card>
        <div className="space-y-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h3 className="text-lg font-semibold text-gray-800">BCS Records</h3>
            <div className="flex gap-3">
              <div className="w-64">
                <SearchInput
                  value={search}
                  onChange={setSearch}
                  placeholder="Search by Tag ID, name..."
                />
              </div>
              <Button
                variant={showFilters ? 'primary' : 'outline'}
                icon={HiOutlineFilter}
                onClick={() => setShowFilters(!showFilters)}
              >
                Filters
              </Button>
            </div>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-xl">
              <Select
                name="sex"
                value={filters.sex}
                onChange={handleFilterChange}
                options={[
                  { value: 'Male', label: 'Male' },
                  { value: 'Female', label: 'Female' }
                ]}
                placeholder="All Sexes"
              />
              <Select
                name="bcsRange"
                value={filters.bcsRange}
                onChange={handleFilterChange}
                options={[
                  { value: 'low', label: 'Low BCS (< 5)' },
                  { value: 'optimal', label: 'Optimal BCS (5 - 7)' },
                  { value: 'high', label: 'High BCS (> 7)' },
                  { value: 'none', label: 'No BCS Recorded' }
                ]}
                placeholder="All BCS Ranges"
              />
              <div className="flex items-end">
                <Button variant="ghost" onClick={clearFilters}>
                  Clear Filters
                </Button>
              </div>
            </div>
          )}
        </div>

        <Table>
          <TableHead>
            <TableHeader>Tag ID</TableHeader>
            <TableHeader>Animal</TableHeader>
            <TableHeader>Previous BCS Date</TableHeader>
            <TableHeader>Previous BCS</TableHeader>
            <TableHeader>Age</TableHeader>
            <TableHeader>Current BCS (Editable)</TableHeader>
            <TableHeader className="text-right">Action</TableHeader>
          </TableHead>
          <TableBody>
            {filteredAnimals.length === 0 ? (
              <TableEmpty
                message="No animals found"
                colSpan={7}
              />
            ) : (
              filteredAnimals.map((animal) => {
                const animalId = getId(animal);
                const latestBcs = getLatestBcs(animalId);
                const previousBcs = getPreviousBcs(animalId);
                
                return (
                  <TableRow key={animalId}>
                    <TableCell>
                      <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                        {animal.tagId}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                          <GiSheep className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{animal.name}</p>
                          <p className="text-xs text-gray-500">{animal.breedType}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-500">
                        {latestBcs ? formatDate(latestBcs.date) : '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {latestBcs ? (
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium ${getBcsColor(getBcsValue(latestBcs))}`}>
                          {Number(getBcsValue(latestBcs)).toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{calculateAge(animal.birthDate || animal.arrivalDate)}</span>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="1"
                        min="1"
                        max="10"
                        value={editedBcs[animalId] || ''}
                        onChange={(e) => handleBcsChange(animalId, e.target.value)}
                        placeholder="1-10"
                        className="w-24"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          icon={HiOutlineSave}
                          onClick={() => saveBcs(animal)}
                          loading={saving[animalId]}
                          disabled={!editedBcs[animalId]}
                        >
                          Save
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {filteredAnimals.length > 0 && (
          <div className="mt-4 text-sm text-gray-500">
            Showing {filteredAnimals.length} of {animals.length} animals
          </div>
        )}
      </Card>

      {/* Recent BCS History */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent BCS Updates</h3>
        <Table>
          <TableHead>
            <TableHeader>Date</TableHeader>
            <TableHeader>Animal</TableHeader>
            <TableHeader>Previous BCS</TableHeader>
            <TableHeader>New BCS</TableHeader>
            <TableHeader>Change</TableHeader>
          </TableHead>
          <TableBody>
            {bcsRecords.slice(0, 10).length === 0 ? (
              <TableEmpty
                message="No BCS records yet"
                colSpan={5}
              />
            ) : (
              bcsRecords.slice(0, 10).map((record) => {
                const prevBcs = record.previousBcsScore ?? record.previousBcs;
                const currentBcs = getBcsValue(record);
                const change = prevBcs != null
                  ? (currentBcs - prevBcs).toFixed(1)
                  : null;
                
                return (
                  <TableRow key={getId(record)}>
                    <TableCell>
                      <span className="text-sm">{formatDate(record.date)}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{record.animalTagId ?? record.tagId}</span>
                        <span className="text-sm text-gray-500">{record.animalName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {prevBcs != null ? (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-sm ${getBcsColor(prevBcs)}`}>
                          {Number(prevBcs).toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium ${getBcsColor(currentBcs)}`}>
                        {Number(currentBcs).toFixed(1)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {change !== null ? (
                        <span className={`text-sm font-medium ${
                          parseFloat(change) > 0 
                            ? 'text-emerald-600' 
                            : parseFloat(change) < 0 
                              ? 'text-red-600' 
                              : 'text-gray-500'
                        }`}>
                          {parseFloat(change) > 0 ? '+' : ''}{change}
                        </span>
                      ) : (
                        <span className="text-gray-400">First record</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default BodyConditionScore;
