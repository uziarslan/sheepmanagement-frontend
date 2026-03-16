import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import {
  HiOutlineFilter,
  HiOutlineEye,
  HiOutlineCalendar,
  HiOutlineShieldCheck
} from 'react-icons/hi';
import { vaccinationAPI, penAPI } from '../../services/api';
import { formatCurrency, formatDate, filterBySearch } from '../../utils/helpers';
import {
  PageHeader,
  Card,
  Button,
  SearchInput,
  Badge,
  Table,
  TableHead,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableEmpty,
  Input,
  Select
} from '../../components/common';
import Modal from '../../components/common/Modal';
import { PageLoader } from '../../components/common/Spinner';

const ApplicationHistory = () => {
  const [applications, setApplications] = useState([]);
  const [pens, setPens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewModal, setViewModal] = useState({ open: false, data: null });
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState({
    scope: '',
    pen: '',
    dateFrom: '',
    dateTo: ''
  });

  const getId = (item) => item?._id ?? item?.id;

  const fetchApplications = useCallback(async () => {
    try {
      const queryParams = {
        ...filters,
        search
      };
      
      // Remove empty filters
      Object.keys(queryParams).forEach(key => {
        if (!queryParams[key]) delete queryParams[key];
      });

      const response = await vaccinationAPI.getApplications(queryParams);
      if (response.success) {
        setApplications(response.data);
      }
    } catch (error) {
      toast.error('Failed to fetch applications');
    }
  }, [filters, search]);

  const fetchData = useCallback(async () => {
    try {
      const pensRes = await penAPI.getAll({ limit: 100 });
      if (pensRes.success) setPens(pensRes.data);
      await fetchApplications();
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [fetchApplications]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const clearFilters = () => {
    setFilters({
      scope: '',
      pen: '',
      dateFrom: '',
      dateTo: ''
    });
  };

  const filteredApplications = filterBySearch(applications, search, ['vaccineName', 'disease']);

  const totalApplications = applications.length;
  const totalAnimals = applications.reduce((sum, app) => sum + (app.animalCount || 0), 0);
  const totalCost = applications.reduce((sum, app) => sum + (app.totalCost || 0), 0);

  const getScopeBadgeVariant = (scope) => {
    switch (scope) {
      case 'Pen': return 'info';
      case 'Individual': return 'warning';
      case 'Multiple': return 'success';
      default: return 'default';
    }
  };

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vaccination History"
        subtitle="View all vaccine applications and records"
        breadcrumbs={[
          { label: 'Vaccination' },
          { label: 'Application History' }
        ]}
        action={
          <Button
            variant="secondary"
            icon={HiOutlineFilter}
            onClick={() => setShowFilters(!showFilters)}
          >
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </Button>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-purple-500 to-purple-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Total Applications</p>
              <p className="text-white text-3xl font-bold mt-1">{totalApplications}</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <HiOutlineShieldCheck className="w-8 h-8 text-white" />
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500 to-blue-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Animals Vaccinated</p>
              <p className="text-white text-3xl font-bold mt-1">{totalAnimals}</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <HiOutlineCalendar className="w-8 h-8 text-white" />
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-sm">Total Cost</p>
              <p className="text-white text-3xl font-bold mt-1">{formatCurrency(totalCost)}</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <HiOutlineShieldCheck className="w-8 h-8 text-white" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filters Card */}
      {showFilters && (
        <Card>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Filters</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Select
              label="Scope"
              name="scope"
              value={filters.scope}
              onChange={handleFilterChange}
              placeholder="All Scopes"
            >
              <option value="Pen">Pen-wide</option>
              <option value="Individual">Individual</option>
              <option value="Multiple">Multiple</option>
            </Select>

            <Select
              label="Pen"
              name="pen"
              value={filters.pen}
              onChange={handleFilterChange}
              placeholder="All Pens"
            >
              {pens.map(pen => (
                <option key={getId(pen)} value={getId(pen)}>
                  {pen.name}
                </option>
              ))}
            </Select>

            <Input
              label="From Date"
              name="dateFrom"
              type="date"
              value={filters.dateFrom}
              onChange={handleFilterChange}
            />

            <Input
              label="To Date"
              name="dateTo"
              type="date"
              value={filters.dateTo}
              onChange={handleFilterChange}
            />
          </div>
          <div className="mt-4 flex justify-end">
            <Button variant="ghost" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        </Card>
      )}

      {/* Table Card */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-800">Application Records</h2>
          <SearchInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by vaccine or disease..."
          />
        </div>

        <Table>
          <TableHead>
            <TableHeader>Date</TableHeader>
            <TableHeader>Vaccine</TableHeader>
            <TableHeader>Disease</TableHeader>
            <TableHeader>Scope</TableHeader>
            <TableHeader>Location</TableHeader>
            <TableHeader>Animals</TableHeader>
            <TableHeader>Cost</TableHeader>
            <TableHeader className="text-right">Actions</TableHeader>
          </TableHead>
          <TableBody>
            {filteredApplications.length === 0 ? (
              <TableEmpty colSpan={8} message="No applications found" />
            ) : (
              filteredApplications.map((app) => {
                const appId = getId(app);
                return (
                  <TableRow key={appId}>
                    <TableCell>
                      <div className="text-sm font-medium text-gray-900">
                        {formatDate(app.date)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-gray-900">
                        {app.vaccineName || app.vaccineRecipe?.name || 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="info">{app.disease || 'N/A'}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getScopeBadgeVariant(app.scope)}>
                        {app.scope}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-gray-600">
                        {app.scope === 'Pen' && (app.penName || app.pen?.name || 'N/A')}
                        {app.scope === 'Individual' && (app.animal?.tagNumber || 'N/A')}
                        {app.scope === 'Multiple' && `${app.animals?.length || 0} animals`}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="success">{app.animalCount || 0}</Badge>
                    </TableCell>
                    <TableCell className="font-semibold">
                      {formatCurrency(app.totalCost || 0)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={HiOutlineEye}
                        onClick={() => setViewModal({ open: true, data: app })}
                        title="View Details"
                      />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* View Modal */}
      <Modal
        isOpen={viewModal.open}
        onClose={() => setViewModal({ open: false, data: null })}
        title="Application Details"
      >
        {viewModal.data && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Date</p>
                <p className="font-medium">{formatDate(viewModal.data.date)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Vaccine</p>
                <p className="font-medium">{viewModal.data.vaccineName || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Disease</p>
                <Badge variant="info">{viewModal.data.disease || 'N/A'}</Badge>
              </div>
              <div>
                <p className="text-sm text-gray-500">Scope</p>
                <Badge variant={getScopeBadgeVariant(viewModal.data.scope)}>
                  {viewModal.data.scope}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-gray-500">Animals Count</p>
                <p className="font-medium">{viewModal.data.animalCount || 0}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Cost</p>
                <p className="font-medium">{formatCurrency(viewModal.data.totalCost || 0)}</p>
              </div>
              {viewModal.data.nextDueDate && (
                <div>
                  <p className="text-sm text-gray-500">Next Due Date</p>
                  <p className="font-medium">{formatDate(viewModal.data.nextDueDate)}</p>
                </div>
              )}
            </div>

            {viewModal.data.medicineUsed?.length > 0 && (
              <div>
                <p className="text-sm text-gray-500 mb-2">Medicines Used</p>
                <div className="space-y-2">
                  {viewModal.data.medicineUsed.map((med, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded">
                      <span>{med.medicineName || 'Medicine'}</span>
                      <span className="font-medium">
                        {med.quantity} {med.unit} @ {formatCurrency(med.rate)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {viewModal.data.remarks && (
              <div>
                <p className="text-sm text-gray-500">Remarks</p>
                <p className="text-gray-700">{viewModal.data.remarks}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ApplicationHistory;
