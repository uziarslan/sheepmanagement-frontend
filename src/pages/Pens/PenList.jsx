import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  HiOutlinePlus,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineViewGrid
} from 'react-icons/hi';
import { GiSheep } from 'react-icons/gi';
import { penAPI } from '../../services/api';
import { getPenTypeColor, filterBySearch } from '../../utils/helpers';
import {
  PageHeader,
  Card,
  Button,
  SearchInput
} from '../../components/common';
import { ConfirmDialog } from '../../components/common/Modal';
import { PageLoader } from '../../components/common/Spinner';

const PenList = () => {
  const navigate = useNavigate();
  const [pens, setPens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteModal, setDeleteModal] = useState({ open: false, pen: null });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchPens();
  }, []);

  const fetchPens = async () => {
    try {
      const response = await penAPI.getAll();
      if (response.success) {
        setPens(response.data);
      }
    } catch (error) {
      toast.error('Failed to fetch pens');
    } finally {
      setLoading(false);
    }
  };

  const getPenId = (pen) => pen?._id || pen?.id;

  const handleDelete = async () => {
    if (!deleteModal.pen) return;
    const penId = getPenId(deleteModal.pen);
    setDeleting(true);
    try {
      await penAPI.delete(penId);
      toast.success('Pen deleted successfully');
      setPens(prev => prev.filter(p => getPenId(p) !== penId));
      setDeleteModal({ open: false, pen: null });
    } catch (error) {
      toast.error(error.message || 'Failed to delete pen');
    } finally {
      setDeleting(false);
    }
  };

  const filteredPens = filterBySearch(pens, search, ['name', 'type']);

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pens"
        subtitle={`${pens.length} pens configured`}
        breadcrumbs={[{ label: 'Pens' }]}
        action={
          <Link to="/dashboard/pens/add">
            <Button icon={HiOutlinePlus}>Add Pen</Button>
          </Link>
        }
      />

      {/* Search */}
      <Card>
        <div className="mb-6">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search pens by name or type..."
          />
        </div>

        {/* Pens Grid */}
        {filteredPens.length === 0 ? (
          <div className="text-center py-12">
            <HiOutlineViewGrid className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">
              {search ? 'No pens match your search' : 'No pens created yet'}
            </p>
            {!search && (
              <Link to="/dashboard/pens/add">
                <Button variant="outline" className="mt-4" icon={HiOutlinePlus}>
                  Create First Pen
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPens.map((pen) => (
              <div
                key={getPenId(pen)}
                className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-lg hover:border-emerald-200 transition-all cursor-pointer"
                onClick={() => navigate(`/dashboard/pens/${getPenId(pen)}`)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                    <HiOutlineViewGrid className="w-6 h-6 text-emerald-600" />
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getPenTypeColor(pen.type)}`}>
                    {pen.type}
                  </span>
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-2">{pen.name}</h3>
                
                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <span>Weight Range</span>
                  <span className="font-medium text-gray-700">
                    {pen.minWeightAvg} - {pen.maxWeightAvg} kg
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <GiSheep className="w-5 h-5 text-emerald-600" />
                    <span className="text-sm text-gray-600">Animals</span>
                  </div>
                  <span className="font-semibold text-gray-900">
                    {pen.animalCount} / {pen.capacity}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="mt-3">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        (pen.capacity > 0 ? pen.animalCount / pen.capacity : 0) > 0.8
                          ? 'bg-red-500'
                          : (pen.capacity > 0 ? pen.animalCount / pen.capacity : 0) > 0.5
                          ? 'bg-yellow-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min((pen.capacity > 0 ? pen.animalCount / pen.capacity : 0) * 100, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1 text-right">
                    {((pen.capacity > 0 ? pen.animalCount / pen.capacity : 0) * 100).toFixed(0)}% capacity
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end space-x-2 mt-4 pt-4 border-t">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/dashboard/pens/${getPenId(pen)}/edit`);
                    }}
                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <HiOutlinePencil className="w-5 h-5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteModal({ open: true, pen });
                    }}
                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <HiOutlineTrash className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, pen: null })}
        onConfirm={handleDelete}
        title="Delete Pen"
        message={`Are you sure you want to delete "${deleteModal.pen?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        loading={deleting}
      />
    </div>
  );
};

export default PenList;
