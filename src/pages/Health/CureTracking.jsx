import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  HiOutlineFilter,
  HiOutlineEye,
  HiOutlineCheck,
  HiOutlineX,
  HiOutlineRefresh
} from 'react-icons/hi';
import { GiSheep } from 'react-icons/gi';
import { healthAPI } from '../../services/mockApi';
import { formatCurrency, formatDate } from '../../utils/helpers';
import {
  PageHeader,
  Card,
  Button,
  Input,
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
import Modal from '../../components/common/Modal';
import { PageLoader } from '../../components/common/Spinner';

const CureTracking = () => {
  const [treatments, setTreatments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [viewModal, setViewModal] = useState({ open: false, data: null });
  
  // Filters
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    status: '' // Cured, Uncured, or empty for all
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await healthAPI.getTreatments();
      if (response.success) {
        setTreatments(response.data);
      }
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const clearFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      status: ''
    });
  };

  const markAsCured = async (treatment) => {
    try {
      const response = await healthAPI.updateTreatment(treatment.id, { ...treatment, cured: 'Yes' });
      if (response.success) {
        setTreatments(prev => prev.map(t => t.id === treatment.id ? { ...t, cured: 'Yes' } : t));
        toast.success(`${treatment.tagId} marked as cured`);
      }
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  // Apply filters
  let filteredTreatments = [...treatments];

  if (filters.startDate) {
    filteredTreatments = filteredTreatments.filter(t => 
      new Date(t.date) >= new Date(filters.startDate)
    );
  }
  if (filters.endDate) {
    filteredTreatments = filteredTreatments.filter(t => 
      new Date(t.date) <= new Date(filters.endDate)
    );
  }
  if (filters.status === 'Cured') {
    filteredTreatments = filteredTreatments.filter(t => t.cured === 'Yes');
  } else if (filters.status === 'Uncured') {
    filteredTreatments = filteredTreatments.filter(t => t.cured === 'No');
  }

  // Stats
  const curedAnimals = treatments.filter(t => t.cured === 'Yes');
  const uncuredAnimals = treatments.filter(t => t.cured === 'No');
  const cureRate = treatments.length > 0 
    ? ((curedAnimals.length / treatments.length) * 100).toFixed(1) 
    : 0;

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cure Tracking"
        subtitle="Track treatment outcomes and recovery status"
        breadcrumbs={[
          { label: 'Health Management' },
          { label: 'Cure Tracking' }
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
            <p className="text-blue-100 text-sm">Total Treatments</p>
            <p className="text-2xl font-bold mt-1">{treatments.length}</p>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600">
          <div className="text-white">
            <p className="text-emerald-100 text-sm">Cured</p>
            <p className="text-2xl font-bold mt-1">{curedAnimals.length}</p>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-red-500 to-red-600">
          <div className="text-white">
            <p className="text-red-100 text-sm">Under Treatment</p>
            <p className="text-2xl font-bold mt-1">{uncuredAnimals.length}</p>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500 to-purple-600">
          <div className="text-white">
            <p className="text-purple-100 text-sm">Cure Rate</p>
            <p className="text-2xl font-bold mt-1">{cureRate}%</p>
          </div>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        {/* Filters */}
        <div className="space-y-4 mb-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800">Treatment Records</h3>
            <Button
              variant={showFilters ? 'primary' : 'outline'}
              icon={HiOutlineFilter}
              onClick={() => setShowFilters(!showFilters)}
            >
              Filters
            </Button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-xl">
              <Input
                label="Start Date"
                type="date"
                name="startDate"
                value={filters.startDate}
                onChange={handleFilterChange}
              />
              <Input
                label="End Date"
                type="date"
                name="endDate"
                value={filters.endDate}
                onChange={handleFilterChange}
              />
              <Select
                label="Status"
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
                options={[
                  { value: 'Cured', label: 'Cured' },
                  { value: 'Uncured', label: 'Under Treatment' }
                ]}
                placeholder="All"
              />
              <div className="flex items-end">
                <Button variant="ghost" onClick={clearFilters}>
                  Clear Filters
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cured Animals */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              <h4 className="font-semibold text-gray-800">
                Cured Animals ({filteredTreatments.filter(t => t.cured === 'Yes').length})
              </h4>
            </div>
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {filteredTreatments.filter(t => t.cured === 'Yes').length === 0 ? (
                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-xl">
                  No cured animals found
                </div>
              ) : (
                filteredTreatments.filter(t => t.cured === 'Yes').map((treatment) => (
                  <div
                    key={treatment.id}
                    className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                          <HiOutlineCheck className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900">{treatment.tagId}</span>
                            <span className="text-sm text-gray-500">{treatment.animalName}</span>
                          </div>
                          <p className="text-sm text-gray-600">{treatment.diagnosis}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            Treated: {formatDate(treatment.date)}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setViewModal({ open: true, data: treatment })}
                        className="p-2 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors"
                      >
                        <HiOutlineEye className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Uncured Animals */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <h4 className="font-semibold text-gray-800">
                Under Treatment ({filteredTreatments.filter(t => t.cured === 'No').length})
              </h4>
            </div>
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {filteredTreatments.filter(t => t.cured === 'No').length === 0 ? (
                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-xl">
                  No animals under treatment
                </div>
              ) : (
                filteredTreatments.filter(t => t.cured === 'No').map((treatment) => (
                  <div
                    key={treatment.id}
                    className="p-4 bg-red-50 border border-red-200 rounded-xl"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                          <HiOutlineX className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900">{treatment.tagId}</span>
                            <span className="text-sm text-gray-500">{treatment.animalName}</span>
                          </div>
                          <p className="text-sm text-gray-600">{treatment.diagnosis}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            Started: {formatDate(treatment.date)} • {treatment.duration || 'Ongoing'}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => markAsCured(treatment)}
                          className="p-2 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors"
                          title="Mark as Cured"
                        >
                          <HiOutlineCheck className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => setViewModal({ open: true, data: treatment })}
                          className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <HiOutlineEye className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Full Table View */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">All Records</h3>
        <Table>
          <TableHead>
            <TableHeader>Date</TableHeader>
            <TableHeader>Tag ID</TableHeader>
            <TableHeader>Animal Name</TableHeader>
            <TableHeader>Diagnosis</TableHeader>
            <TableHeader>Type</TableHeader>
            <TableHeader>Duration</TableHeader>
            <TableHeader>Cost</TableHeader>
            <TableHeader>Status</TableHeader>
            <TableHeader className="text-right">Actions</TableHeader>
          </TableHead>
          <TableBody>
            {filteredTreatments.length === 0 ? (
              <TableEmpty
                message="No records found matching your filters"
                colSpan={9}
              />
            ) : (
              filteredTreatments.map((treatment) => (
                <TableRow key={treatment.id}>
                  <TableCell>
                    <span className="text-sm">{formatDate(treatment.date)}</span>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                      {treatment.tagId}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-emerald-100 flex items-center justify-center">
                        <GiSheep className="w-4 h-4 text-emerald-600" />
                      </div>
                      <span>{treatment.animalName}</span>
                    </div>
                  </TableCell>
                  <TableCell>{treatment.diagnosis}</TableCell>
                  <TableCell>
                    <Badge variant={treatment.type === 'Treatment' ? 'info' : 'warning'}>
                      {treatment.type}
                    </Badge>
                  </TableCell>
                  <TableCell>{treatment.duration || '-'}</TableCell>
                  <TableCell>
                    <span className="font-medium text-emerald-600">
                      {formatCurrency(treatment.totalAmount || 0)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={treatment.cured === 'Yes' ? 'success' : 'danger'}>
                      {treatment.cured === 'Yes' ? 'Cured' : 'Under Treatment'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      {treatment.cured === 'No' && (
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
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

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
                <Badge variant={viewModal.data.cured === 'Yes' ? 'success' : 'danger'}>
                  {viewModal.data.cured === 'Yes' ? 'Cured' : 'Under Treatment'}
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

            {viewModal.data.cured === 'No' && (
              <div className="pt-4 border-t">
                <Button
                  icon={HiOutlineCheck}
                  onClick={() => {
                    markAsCured(viewModal.data);
                    setViewModal({ open: false, data: null });
                  }}
                >
                  Mark as Cured
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default CureTracking;
