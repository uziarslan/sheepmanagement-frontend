import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  HiOutlinePlus,
  HiOutlineEye,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineFilter,
  HiOutlineExclamationCircle,
  HiOutlineShoppingCart
} from 'react-icons/hi';
import { GiSheep } from 'react-icons/gi';
import { animalAPI, penAPI } from '../../services/mockApi';
import { formatCurrency, getStatusColor, filterBySearch } from '../../utils/helpers';
import {
  PageHeader,
  Card,
  Button,
  SearchInput,
  Select,
  Badge,
  Table,
  TableHead,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableEmpty
} from '../../components/common';
import { ConfirmDialog } from '../../components/common/Modal';
import { PageLoader } from '../../components/common/Spinner';
import { animalTypes, breedTypes, animalStatuses } from '../../data/mockData';

const AnimalList = () => {
  const navigate = useNavigate();
  const [animals, setAnimals] = useState([]);
  const [pens, setPens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    type: '',
    breed: '',
    status: '',
    penId: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ open: false, animal: null });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [animalsRes, pensRes] = await Promise.all([
        animalAPI.getAll(),
        penAPI.getAll()
      ]);
      if (animalsRes.success) setAnimals(animalsRes.data);
      if (pensRes.success) setPens(pensRes.data);
    } catch (error) {
      toast.error('Failed to fetch animals');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.animal) return;
    
    setDeleting(true);
    try {
      await animalAPI.delete(deleteModal.animal.id);
      toast.success('Animal deleted successfully');
      setAnimals(prev => prev.filter(a => a.id !== deleteModal.animal.id));
      setDeleteModal({ open: false, animal: null });
    } catch (error) {
      toast.error(error.message || 'Failed to delete animal');
    } finally {
      setDeleting(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const clearFilters = () => {
    setFilters({ type: '', breed: '', status: '', penId: '' });
    setSearch('');
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
    if (penId == null || penId === '') return '-';
    const foundPen = pens.find(p => (p._id || p.id) == penId);
    return foundPen ? foundPen.name : '-';
  };

  const getPenNameById = (penId) => {
    if (penId == null || penId === '') return '-';
    const pen = pens.find(p => (p._id || p.id) == penId);
    return pen ? pen.name : '-';
  };

  // Filter animals
  let filteredAnimals = filterBySearch(animals, search, ['tagId', 'name', 'breedType']);
  
  if (filters.type) {
    filteredAnimals = filteredAnimals.filter(a => a.animalType === filters.type);
  }
  if (filters.breed) {
    filteredAnimals = filteredAnimals.filter(a => a.breedType === filters.breed);
  }
  if (filters.status) {
    filteredAnimals = filteredAnimals.filter(a => a.status === filters.status);
  }
  if (filters.penId) {
    filteredAnimals = filteredAnimals.filter(a => getAnimalPenId(a) == filters.penId);
  }

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Animals"
        subtitle={`${animals.length} total animals registered`}
        breadcrumbs={[{ label: 'Animals' }]}
        action={
          <div className="flex space-x-3">
            <Link to="/dashboard/animals/sell">
              <Button variant="outline" icon={HiOutlineShoppingCart} className="border-emerald-200 text-emerald-600 hover:bg-emerald-50">
                Sell Animals
              </Button>
            </Link>
            <Link to="declare-dead">
              <Button variant="outline" icon={HiOutlineExclamationCircle} className="border-red-200 text-red-600 hover:bg-red-50">
                Declare Dead
              </Button>
            </Link>
            <Link to="/dashboard/animals/add">
              <Button icon={HiOutlinePlus}>Add Animal</Button>
            </Link>
          </div>
        }
      />

      <Card>
        {/* Search and Filters */}
        <div className="space-y-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search by Tag ID, Name, or Breed..."
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

          {/* Filter Options */}
          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-xl">
              <Select
                name="type"
                value={filters.type}
                onChange={handleFilterChange}
                options={animalTypes}
                placeholder="All Types"
              />
              <Select
                name="breed"
                value={filters.breed}
                onChange={handleFilterChange}
                options={breedTypes}
                placeholder="All Breeds"
              />
              <Select
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
                options={animalStatuses}
                placeholder="All Statuses"
              />
              <Select
                name="penId"
                value={filters.penId}
                onChange={handleFilterChange}
                options={pens.map(p => ({ value: p._id || p.id, label: p.name }))}
                placeholder="All Pens"
              />
              <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear Filters
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Table */}
        <Table>
          <TableHead>
            <TableHeader>Animal</TableHeader>
            <TableHeader>Tag ID</TableHeader>
            <TableHeader>Type / Breed</TableHeader>
            <TableHeader>Sex</TableHeader>
            <TableHeader>Weight</TableHeader>
            <TableHeader>Pen</TableHeader>
            <TableHeader>Price</TableHeader>
            <TableHeader>Price/Kg</TableHeader>
            <TableHeader>Cost</TableHeader>
            <TableHeader>Total Price</TableHeader>
            <TableHeader>Total Price/Kg</TableHeader>
            <TableHeader>Status</TableHeader>
            <TableHeader className="text-right">Actions</TableHeader>
          </TableHead>
          <TableBody>
            {filteredAnimals.length === 0 ? (
              <TableEmpty
                message={search || Object.values(filters).some(v => v) 
                  ? "No animals match your search criteria" 
                  : "No animals registered yet"
                }
                colSpan={13}
              />
            ) : (
              filteredAnimals.map((animal) => (
                <TableRow key={getId(animal)}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                        <GiSheep className="w-6 h-6 text-emerald-600" />
                      </div>
                      <span className="font-medium text-gray-900">{animal.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                      {animal.tagId}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{animal.animalType}</p>
                      <p className="text-sm text-gray-500">{animal.breedType}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={animal.sex === 'Male' ? 'info' : 'purple'}>
                      {animal.sex}
                    </Badge>
                  </TableCell>
                  <TableCell>{animal.weight} kg</TableCell>
                  <TableCell>
                    <span className="text-sm">{getAnimalPenName(animal)}</span>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{formatCurrency(animal.purchasePrice)}</span>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-emerald-600">
                      {animal.weight > 0 
                        ? formatCurrency(animal.purchasePrice / animal.weight) 
                        : '-'
                      }
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-orange-600">
                      {formatCurrency(animal.cost || 0)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-blue-600">
                      {formatCurrency((animal.purchasePrice || 0) + (animal.cost || 0))}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-blue-600">
                      {animal.weight > 0 
                        ? formatCurrency(((animal.purchasePrice || 0) + (animal.cost || 0)) / animal.weight) 
                        : '-'
                      }
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(animal.status)}`}>
                      {animal.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => navigate(`/dashboard/animals/${animal.id}`)}
                        className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="View"
                      >
                        <HiOutlineEye className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => navigate(`/dashboard/animals/${getId(animal)}/edit`)}
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <HiOutlinePencil className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setDeleteModal({ open: true, animal })}
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

        {/* Results count */}
        {filteredAnimals.length > 0 && (
          <div className="mt-4 text-sm text-gray-500">
            Showing {filteredAnimals.length} of {animals.length} animals
          </div>
        )}
      </Card>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, animal: null })}
        onConfirm={handleDelete}
        title="Delete Animal"
        message={`Are you sure you want to delete "${deleteModal.animal?.name}" (${deleteModal.animal?.tagId})? This action cannot be undone.`}
        confirmText="Delete"
        loading={deleting}
      />
    </div>
  );
};

export default AnimalList;
