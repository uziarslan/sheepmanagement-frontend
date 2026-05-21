import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  HiOutlinePlus,
  HiOutlineEye,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineFilter,
  HiOutlineDocumentDownload,
  HiOutlineExclamationCircle,
  HiOutlineShoppingCart,
  HiOutlineClock
} from 'react-icons/hi';
import { GiSheep } from 'react-icons/gi';
import { useAuth } from '../../Context/AuthContext';
import { animalAPI, penAPI } from '../../services/api';
import { formatCurrency, getStatusColor, calculateDaysSince } from '../../utils/helpers';
import ExcelJS from 'exceljs';
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

// Threshold (in days) at which animals are flagged as "on farm for too long"
// and surfaced as a prominent alert. Client-requested cut-off.
const OVER_AGE_DAYS = 85;

const AnimalList = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';
  const [animals, setAnimals] = useState([]);
  const [pens, setPens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    type: '',
    breed: '',
    status: '',
    penId: '',
    // 'overAge' is purely UI-side; when true we send minDaysSinceAdded.
    overAge: false
  });
  // Total count of "85+ days on farm" Active animals, across all pages.
  // Drives the alert banner regardless of which page the user is on.
  const [overAgeCount, setOverAgeCount] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ open: false, animal: null });
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(async (overrides = {}) => {
    try {
      setLoading(true);

      const params = {
        page,
        limit,
        sort: 'tagId',
        ...overrides
      };
      // Fall back to current state ONLY when the caller didn't mention the
      // key at all. `key in overrides` distinguishes "explicitly cleared
      // (key: undefined)" from "not specified" — important for clearFilters
      // which would otherwise re-pick stale filter state via the closure.
      if (!('status' in overrides) && filters.status) params.status = filters.status;
      if (!('animalType' in overrides) && filters.type) params.animalType = filters.type;
      if (!('breedType' in overrides) && filters.breed) params.breedType = filters.breed;
      if (!('pen' in overrides) && filters.penId) params.pen = filters.penId;
      if (!('search' in overrides) && search) params.search = search;
      if (!('minDaysSinceAdded' in overrides) && filters.overAge) {
        params.minDaysSinceAdded = OVER_AGE_DAYS;
      }
      // Strip explicitly-cleared keys so they aren't sent on the query
      // string. Empty strings (e.g. search: '') are dropped too — the
      // backend Joi `string()` schemas reject empty values and would 400
      // the whole request, leaving the previous filter results visible.
      Object.keys(params).forEach((k) => {
        if (params[k] === undefined || params[k] === '') delete params[k];
      });

      const [animalsRes, pensRes] = await Promise.all([
        animalAPI.getAll(params),
        penAPI.getAll({ limit: 100 })
      ]);

      if (animalsRes.success) {
        setAnimals(animalsRes.data || []);
        setTotal(animalsRes.meta?.total || 0);
      }
      if (pensRes.success) setPens(pensRes.data);
    } catch (error) {
      toast.error('Failed to fetch animals');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, filters]);

  // Initial load
  useEffect(() => {
    fetchData();
    fetchOverAgeCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Separate lightweight query (limit=1) just to read the total count of
  // animals on the farm 85+ days — drives the alert banner. Cheap because
  // we only care about meta.total.
  const fetchOverAgeCount = async () => {
    try {
      const res = await animalAPI.getAll({
        status: 'Active',
        minDaysSinceAdded: OVER_AGE_DAYS,
        limit: 1,
        page: 1
      });
      if (res?.success) setOverAgeCount(res.meta?.total || 0);
    } catch (_) {
      // Non-fatal: the alert just won't render.
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.animal) return;
    
    setDeleting(true);
    try {
      await animalAPI.delete(deleteModal.animal.id);
      toast.success('Animal deleted successfully');
      setDeleteModal({ open: false, animal: null });
      // refresh current page + the alert count
      fetchData();
      fetchOverAgeCount();
    } catch (error) {
      toast.error(error.message || 'Failed to delete animal');
    } finally {
      setDeleting(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    const nextValue = name === 'overAge' ? value === 'over' : value;
    const newFilters = { ...filters, [name]: nextValue };
    setFilters(newFilters);
    setPage(1);
    const overrides = {};
    if (newFilters.status) overrides.status = newFilters.status;
    if (newFilters.type) overrides.animalType = newFilters.type;
    if (newFilters.breed) overrides.breedType = newFilters.breed;
    if (newFilters.penId) overrides.pen = newFilters.penId;
    if (newFilters.overAge) overrides.minDaysSinceAdded = OVER_AGE_DAYS;
    if (search) overrides.search = search;
    fetchData({ ...overrides, page: 1 });
  };

  // Convenience: jump straight to the 85+ days view from the alert banner.
  const showOnlyOverAge = () => {
    const newFilters = { ...filters, status: 'Active', overAge: true };
    setFilters(newFilters);
    setShowFilters(true);
    setPage(1);
    fetchData({
      page: 1,
      status: 'Active',
      minDaysSinceAdded: OVER_AGE_DAYS,
      animalType: filters.type || undefined,
      breedType: filters.breed || undefined,
      pen: filters.penId || undefined,
      search: search || undefined
    });
  };

  const clearFilters = () => {
    setFilters({ type: '', breed: '', status: '', penId: '', overAge: false });
    setSearch('');
    setPage(1);
    fetchData({
      page: 1,
      search: '',
      status: undefined,
      animalType: undefined,
      breedType: undefined,
      pen: undefined,
      minDaysSinceAdded: undefined
    });
  };

  const handleSearchChange = (value) => {
    setSearch(value);
    setPage(1);
    // Debounced fetch happens in effect below
  };

  // Debounce search input — fetchData is in useCallback so it always has fresh filter state
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData({ page: 1 });
    }, 500);
    return () => clearTimeout(timer);
    // fetchData is excluded from deps intentionally: we only want to debounce on search
    // changes; filter/page changes are handled by direct fetchData calls in their handlers
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const getId = (item) => item?._id ?? item?.id;

  const exportToExcel = async () => {
    // Fetch all animals page-by-page using current filters/search
    const fetchAllPages = async (fetchFn, { limit = 100, maxPages = 50 } = {}) => {
      const all = [];
      for (let page = 1; page <= maxPages; page++) {
        const res = await fetchFn({ page, limit });
        if (!res?.success) throw new Error(res?.message || 'Request failed');
        const chunk = Array.isArray(res.data) ? res.data : [];
        all.push(...chunk);
        if (chunk.length < limit) break;
      }
      return all;
    };

    try {
      const baseParams = {
        sort: 'tagId',
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.type ? { animalType: filters.type } : {}),
        ...(filters.breed ? { breedType: filters.breed } : {}),
        ...(filters.penId ? { pen: filters.penId } : {}),
        ...(filters.overAge ? { minDaysSinceAdded: OVER_AGE_DAYS } : {}),
        ...(search ? { search } : {})
      };

      const animalsAll = await fetchAllPages((p) => animalAPI.getAll({ ...p, ...baseParams }), { limit: 100, maxPages: 50 });

      if (!animalsAll || animalsAll.length === 0) {
        toast.error('No animals to export (check your filters)');
        return;
      }

      const headers = ['Tag ID', 'Name', 'Pen', 'Sex', 'Breed', 'Purchase Price', 'Buying Weight (kg)', 'Current Weight (kg)', 'Status', 'Added Date'];
      const aoa = [headers];

      for (const a of animalsAll) {
        aoa.push([
          a.tagId || '',
          a.name || '',
          getAnimalPenName(a),
          a.sex || '',
          a.breedType || '',
          a.purchasePrice != null ? Number(a.purchasePrice) : '',
          a.buyingWeight != null ? Number(a.buyingWeight) : '',
          a.weight != null ? Number(a.weight) : '',
          a.status || '',
          a.createdAt ? new Date(a.createdAt).toLocaleDateString() : ''
        ]);
      }

      const wb = new ExcelJS.Workbook();
      const sheet = wb.addWorksheet('Animals');
      sheet.columns = aoa[0].map(() => ({ width: 18 }));
      sheet.addRows(aoa);
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `animals_${new Date().toISOString().slice(0,10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${animalsAll.length} animals`);
    } catch (err) {
      if (typeof console !== 'undefined' && console.error) {
        console.error('Export failed', err);
      }
      toast.error(err.message || 'Failed to export animals');
    }
  };

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
    if (penId === null || penId === undefined || penId === '') return '-';
    const foundPen = pens.find(p => String(p._id || p.id) === String(penId));
    return foundPen ? foundPen.name : '-';
  };

  // Client-side filtering is replaced by server-side pagination/filters
  const filteredAnimals = animals;

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Animals"
        subtitle={`${total} total animals registered`}
        breadcrumbs={[{ label: 'Animals' }]}
        action={
          <div className="flex space-x-3">
            <Button variant="outline" icon={HiOutlineDocumentDownload} onClick={exportToExcel}>
              Export Excel
            </Button>
            {isAdmin && (
              <Link to="/dashboard/animals/sell">
                <Button variant="outline" icon={HiOutlineShoppingCart} className="border-emerald-200 text-emerald-600 hover:bg-emerald-50">
                  Sell Animals
                </Button>
              </Link>
            )}
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

      {/* 85+ days on farm alert — surfaces stale-roster animals at a glance. */}
      {overAgeCount > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start gap-3">
            <HiOutlineClock className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-900">
                {overAgeCount} active animal{overAgeCount === 1 ? ' has' : 's have'} been on the farm for {OVER_AGE_DAYS}+ days
              </p>
              <p className="text-xs text-amber-800">
                Review these for sale or transfer to keep your fattening cycle on track.
              </p>
            </div>
          </div>
          {!filters.overAge && (
            <Button
              variant="outline"
              size="sm"
              onClick={showOnlyOverAge}
              className="border-amber-400 text-amber-800 hover:bg-amber-100"
            >
              Show only these
            </Button>
          )}
        </div>
      )}

      <Card>
        {/* Search and Filters */}
        <div className="space-y-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <SearchInput
                value={search}
                onChange={handleSearchChange}
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
              <Select
                name="overAge"
                value={filters.overAge ? 'over' : ''}
                onChange={handleFilterChange}
                options={[
                  { value: 'over', label: `On farm ${OVER_AGE_DAYS}+ days` }
                ]}
                placeholder="Any age on farm"
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
            <TableHeader>Added Date</TableHeader>
            <TableHeader>Type / Breed</TableHeader>
            <TableHeader>Sex</TableHeader>
            <TableHeader>Buying Weight</TableHeader>
            <TableHeader>Pen</TableHeader>
            <TableHeader>Price</TableHeader>
            <TableHeader>Price/Kg</TableHeader>
            <TableHeader>Current Weight</TableHeader>
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
                colSpan={15}
              />
            ) : (
              filteredAnimals.map((animal) => {
                const daysOnFarm = calculateDaysSince(animal.createdAt);
                const overAge = daysOnFarm != null && daysOnFarm >= OVER_AGE_DAYS;
                return (
                <TableRow
                  key={getId(animal)}
                  className={overAge ? 'bg-amber-50' : ''}
                >
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${overAge ? 'bg-amber-100' : 'bg-emerald-100'}`}>
                        <GiSheep className={`w-6 h-6 ${overAge ? 'text-amber-600' : 'text-emerald-600'}`} />
                      </div>
                      <div>
                        <span className="font-medium text-gray-900">{animal.name}</span>
                        {overAge && (
                          <Badge variant="warning" className="ml-2 inline-flex items-center gap-1 text-xs">
                            <HiOutlineClock className="w-3 h-3" />
                            {daysOnFarm}d on farm
                          </Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                      {animal.tagId}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-gray-600">
                      {animal.createdAt ? new Date(animal.createdAt).toLocaleDateString() : '-'}
                      {daysOnFarm != null && (
                        <p className={`text-xs ${overAge ? 'text-amber-700 font-medium' : 'text-gray-400'}`}>
                          {daysOnFarm} day{daysOnFarm === 1 ? '' : 's'} ago
                        </p>
                      )}
                    </div>
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
                  <TableCell>
                    <span className="font-medium">{animal.buyingWeight ? `${animal.buyingWeight} kg` : '-'}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{getAnimalPenName(animal)}</span>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{formatCurrency(animal.purchasePrice)}</span>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-emerald-600">
                      {animal.buyingWeight > 0
                        ? formatCurrency(animal.purchasePrice / animal.buyingWeight)
                        : '-'
                      }
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{animal.weight} kg</span>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-orange-600">
                      {formatCurrency(animal.cost || 0)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-blue-600">
                      {formatCurrency(animal.totalPrice ?? (animal.purchasePrice || 0) + (animal.cost || 0))}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-blue-600">
                      {animal.weight > 0 
                        ? formatCurrency((animal.totalPrice ?? (animal.purchasePrice || 0) + (animal.cost || 0)) / animal.weight) 
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
                        onClick={() => navigate(`/dashboard/animals/${getId(animal)}`)}
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
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Pagination controls */}
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Showing {( (page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} animals
          </div>
          <div className="flex items-center space-x-2">
            <Select
              name="limit"
              value={limit}
              onChange={(e) => {
                const newLimit = Number(e.target.value) || 10;
                setLimit(newLimit);
                setPage(1);
                fetchData({ limit: newLimit, page: 1 });
              }}
              options={[{ value: 10, label: '10' }, { value: 25, label: '25' }, { value: 50, label: '50' }]}
              placeholder="Per page"
            />
            <div className="flex items-center space-x-1">
              <Button
                variant="outline"
                disabled={page <= 1}
                onClick={() => {
                  if (page > 1) {
                    const newPage = page - 1;
                    setPage(newPage);
                    fetchData({ page: newPage, limit });
                  }
                }}
              >
                Prev
              </Button>
              <div className="px-2 text-sm">Page {page} of {Math.max(1, Math.ceil(total / limit))}</div>
              <Button
                variant="outline"
                disabled={page >= Math.ceil(total / limit)}
                onClick={() => {
                  const lastPage = Math.max(1, Math.ceil(total / limit));
                  if (page < lastPage) {
                    const newPage = page + 1;
                    setPage(newPage);
                    fetchData({ page: newPage, limit });
                  }
                }}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
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
