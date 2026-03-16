import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  HiOutlinePlus,
  HiOutlineEye,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlinePlay,
  HiOutlineShieldCheck
} from 'react-icons/hi';
import { vaccinationAPI } from '../../services/api';
import { formatCurrency, filterBySearch } from '../../utils/helpers';
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
  TableEmpty
} from '../../components/common';
import Modal, { ConfirmDialog } from '../../components/common/Modal';
import { PageLoader } from '../../components/common/Spinner';

const VaccineList = () => {
  const navigate = useNavigate();
  const [vaccines, setVaccines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewModal, setViewModal] = useState({ open: false, data: null });
  const [deleteModal, setDeleteModal] = useState({ open: false, item: null });
  const [deleting, setDeleting] = useState(false);

  const getId = (item) => item?._id ?? item?.id;

  useEffect(() => {
    fetchVaccines();
  }, []);

  const fetchVaccines = async () => {
    try {
      const response = await vaccinationAPI.getAllVaccines();
      if (response.success) {
        setVaccines(response.data);
      }
    } catch (error) {
      toast.error('Failed to fetch vaccines');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.item) return;
    const itemId = getId(deleteModal.item);
    setDeleting(true);
    try {
      await vaccinationAPI.deleteVaccine(itemId);
      toast.success('Vaccine deleted successfully');
      setVaccines(prev => prev.filter(v => getId(v) !== itemId));
      setDeleteModal({ open: false, item: null });
    } catch (error) {
      toast.error('Failed to delete vaccine');
    } finally {
      setDeleting(false);
    }
  };

  const filteredVaccines = filterBySearch(vaccines, search, ['name', 'disease']);

  const totalVaccines = vaccines.length;
  const totalApplied = vaccines.reduce((sum, v) => sum + (v.appliedCount || 0), 0);
  const totalValue = vaccines.reduce((sum, v) => sum + (v.totalCost || 0), 0);

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vaccine Recipes"
        subtitle="Manage vaccine formulas and apply to animals"
        breadcrumbs={[
          { label: 'Vaccination' },
          { label: 'All Vaccines' }
        ]}
        action={
          <Link to="/dashboard/vaccination/vaccines/add">
            <Button icon={HiOutlinePlus}>Create Vaccine</Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-purple-500 to-purple-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Total Recipes</p>
              <p className="text-white text-3xl font-bold mt-1">{totalVaccines}</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <HiOutlineShieldCheck className="w-8 h-8 text-white" />
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500 to-blue-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Total Applied</p>
              <p className="text-white text-3xl font-bold mt-1">{totalApplied}</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <HiOutlinePlay className="w-8 h-8 text-white" />
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-sm">Total Cost/Animal</p>
              <p className="text-white text-3xl font-bold mt-1">{formatCurrency(totalValue)}</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <HiOutlineShieldCheck className="w-8 h-8 text-white" />
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-800">All Vaccine Recipes</h2>
          <SearchInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search vaccines..."
          />
        </div>

        <Table>
          <TableHead>
            <TableHeader>Vaccine</TableHeader>
            <TableHeader>Disease</TableHeader>
            <TableHeader>Medicines</TableHeader>
            <TableHeader>Quantity</TableHeader>
            <TableHeader>Cost/Animal</TableHeader>
            <TableHeader>Applied</TableHeader>
            <TableHeader className="text-right">Actions</TableHeader>
          </TableHead>
            <TableBody>
              {filteredVaccines.length === 0 ? (
                <TableEmpty colSpan={7} message="No vaccines found" />
              ) : (
                filteredVaccines.map((vaccine) => {
                  const vId = getId(vaccine);
                  return (
                    <TableRow key={vId}>
                      <TableCell>
                        <div className="font-medium text-gray-900">{vaccine.name}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="info">{vaccine.disease}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">{vaccine.medicines?.length || 0} items</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">{vaccine.totalQuantity?.toFixed(2) || 0} ml</span>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(vaccine.totalCost || 0)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="success">{vaccine.appliedCount || 0}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={HiOutlineEye}
                            onClick={() => setViewModal({ open: true, data: vaccine })}
                            title="View Details"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={HiOutlinePlay}
                            onClick={() => navigate(`/dashboard/vaccination/apply?vaccine=${vId}`)}
                            title="Apply Vaccine"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={HiOutlinePencil}
                            onClick={() => navigate(`/dashboard/vaccination/vaccines/edit/${vId}`)}
                            title="Edit"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={HiOutlineTrash}
                            onClick={() => setDeleteModal({ open: true, item: vaccine })}
                            title="Delete"
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
      </Card>

      <Modal
        isOpen={viewModal.open}
        onClose={() => setViewModal({ open: false, data: null })}
        title="Vaccine Recipe Details"
      >
        {viewModal.data && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Name</p>
                <p className="font-medium">{viewModal.data.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Disease</p>
                <Badge variant="info">{viewModal.data.disease}</Badge>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Quantity</p>
                <p className="font-medium">{viewModal.data.totalQuantity} ml</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Cost/Animal</p>
                <p className="font-medium">{formatCurrency(viewModal.data.totalCost || 0)}</p>
              </div>
            </div>

            {viewModal.data.dosageInstructions && (
              <div>
                <p className="text-sm text-gray-500">Dosage Instructions</p>
                <p className="text-gray-700">{viewModal.data.dosageInstructions}</p>
              </div>
            )}

            {viewModal.data.medicines?.length > 0 && (
              <div>
                <p className="text-sm text-gray-500 mb-2">Medicines</p>
                <div className="space-y-2">
                  {viewModal.data.medicines.map((med, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <span>{med.name || med.medicine?.productName || 'Medicine'}</span>
                      <span className="font-medium">{med.quantity} ml</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, item: null })}
        onConfirm={handleDelete}
        title="Delete Vaccine Recipe"
        message={`Are you sure you want to delete "${deleteModal.item?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        loading={deleting}
        variant="danger"
      />
    </div>
  );
};

export default VaccineList;
