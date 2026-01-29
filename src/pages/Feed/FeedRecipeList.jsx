import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  HiOutlinePlus,
  HiOutlineEye,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlinePlay,
  HiOutlineBeaker
} from 'react-icons/hi';
import { feedAPI } from '../../services/mockApi';
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
  TableEmpty
} from '../../components/common';
import Modal, { ConfirmDialog } from '../../components/common/Modal';
import { PageLoader } from '../../components/common/Spinner';

const FeedRecipeList = () => {
  const navigate = useNavigate();
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewModal, setViewModal] = useState({ open: false, data: null });
  const [deleteModal, setDeleteModal] = useState({ open: false, item: null });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchRecipes();
  }, []);

  const fetchRecipes = async () => {
    try {
      const response = await feedAPI.getAllRecipes();
      if (response.success) {
        setRecipes(response.data);
      }
    } catch (error) {
      toast.error('Failed to fetch recipes');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.item) return;
    
    setDeleting(true);
    try {
      await feedAPI.deleteRecipe(deleteModal.item.id);
      toast.success('Recipe deleted successfully');
      setRecipes(prev => prev.filter(r => r.id !== deleteModal.item.id));
      setDeleteModal({ open: false, item: null });
    } catch (error) {
      toast.error('Failed to delete recipe');
    } finally {
      setDeleting(false);
    }
  };

  const filteredRecipes = filterBySearch(recipes, search, ['name', 'penName', 'description']);

  // Stats
  const totalRecipes = recipes.length;
  const totalCost = recipes.reduce((sum, r) => sum + (r.totalCost || 0), 0);
  const appliedRecipes = recipes.filter(r => r.appliedCount > 0).length;

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Feed Recipes"
        subtitle="Manage feed recipes for different sheds"
        breadcrumbs={[
          { label: 'Feed Management' },
          { label: 'Recipes' }
        ]}
        action={
          <Link to="/dashboard/feed/recipes/add">
            <Button icon={HiOutlinePlus}>Create Recipe</Button>
          </Link>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-amber-500 to-amber-600">
          <div className="text-white">
            <p className="text-amber-100 text-sm">Total Recipes</p>
            <p className="text-2xl font-bold mt-1">{totalRecipes}</p>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600">
          <div className="text-white">
            <p className="text-emerald-100 text-sm">Total Recipe Value</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(totalCost)}</p>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600">
          <div className="text-white">
            <p className="text-blue-100 text-sm">Applied Recipes</p>
            <p className="text-2xl font-bold mt-1">{appliedRecipes}</p>
          </div>
        </Card>
      </div>

      {/* Recipes List */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h3 className="text-lg font-semibold text-gray-800">All Recipes</h3>
          <div className="w-full sm:w-64">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search recipes..."
            />
          </div>
        </div>

        <Table>
          <TableHead>
            <TableHeader>Recipe Name</TableHeader>
            <TableHeader>Shed/Pen</TableHeader>
            <TableHeader>Ingredients</TableHeader>
            <TableHeader>Total Quantity</TableHeader>
            <TableHeader>Total Cost</TableHeader>
            <TableHeader>Applied</TableHeader>
            <TableHeader className="text-right">Actions</TableHeader>
          </TableHead>
          <TableBody>
            {filteredRecipes.length === 0 ? (
              <TableEmpty
                message={search ? "No recipes match your search" : "No recipes created yet"}
                colSpan={7}
              />
            ) : (
              filteredRecipes.map((recipe) => (
                <TableRow key={recipe.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                        <HiOutlineBeaker className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{recipe.name}</p>
                        {recipe.description && (
                          <p className="text-xs text-gray-500 truncate max-w-[200px]">
                            {recipe.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="info">{recipe.penName}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{recipe.ingredients?.length || 0}</span>
                    <span className="text-gray-500 text-sm ml-1">items</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-gray-700">{recipe.totalQuantity?.toFixed(2) || 0} units</span>
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold text-emerald-600">
                      {formatCurrency(recipe.totalCost || 0)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={recipe.appliedCount > 0 ? 'success' : 'default'}>
                      {recipe.appliedCount || 0} times
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => navigate(`/dashboard/feed/apply?recipe=${recipe.id}`)}
                        className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="Apply Recipe"
                      >
                        <HiOutlinePlay className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setViewModal({ open: true, data: recipe })}
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <HiOutlineEye className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => navigate(`/dashboard/feed/recipes/${recipe.id}/edit`)}
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <HiOutlinePencil className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setDeleteModal({ open: true, item: recipe })}
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
      </Card>

      {/* View Details Modal */}
      <Modal
        isOpen={viewModal.open}
        onClose={() => setViewModal({ open: false, data: null })}
        title="Recipe Details"
        size="lg"
      >
        {viewModal.data && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Recipe Name</p>
                <p className="font-medium">{viewModal.data.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Shed/Pen</p>
                <Badge variant="info">{viewModal.data.penName}</Badge>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Quantity</p>
                <p className="font-medium">{viewModal.data.totalQuantity?.toFixed(2)} units</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Times Applied</p>
                <p className="font-medium">{viewModal.data.appliedCount || 0}</p>
              </div>
            </div>

            {viewModal.data.description && (
              <div>
                <p className="text-sm text-gray-500">Description</p>
                <p className="text-gray-700">{viewModal.data.description}</p>
              </div>
            )}

            {viewModal.data.ingredients?.length > 0 && (
              <div>
                <p className="text-sm text-gray-500 mb-2">Ingredients</p>
                <div className="border rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Ingredient</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Quantity</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Rate</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {viewModal.data.ingredients.map((ing, i) => (
                        <tr key={i}>
                          <td className="px-4 py-2 text-sm font-medium">{ing.name}</td>
                          <td className="px-4 py-2 text-sm">{ing.quantity} {ing.unit}</td>
                          <td className="px-4 py-2 text-sm">{formatCurrency(ing.ratePerUnit)}/{ing.unit}</td>
                          <td className="px-4 py-2 text-sm font-medium text-emerald-600">
                            {formatCurrency(ing.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="pt-4 border-t">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-gray-700">Total Cost:</span>
                <span className="text-2xl font-bold text-emerald-600">
                  {formatCurrency(viewModal.data.totalCost || 0)}
                </span>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                fullWidth
                icon={HiOutlinePlay}
                onClick={() => {
                  setViewModal({ open: false, data: null });
                  navigate(`/dashboard/feed/apply?recipe=${viewModal.data.id}`);
                }}
              >
                Apply This Recipe
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, item: null })}
        onConfirm={handleDelete}
        title="Delete Recipe"
        message={`Are you sure you want to delete "${deleteModal.item?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        loading={deleting}
      />
    </div>
  );
};

export default FeedRecipeList;
