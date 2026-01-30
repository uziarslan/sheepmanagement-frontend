import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  HiOutlinePlus,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineFilter,
  HiOutlineCube
} from 'react-icons/hi';
import { stockAPI } from '../../services/mockApi';
import { formatCurrency, getStockCategoryColor, filterBySearch } from '../../utils/helpers';
import {
  PageHeader,
  Card,
  Button,
  SearchInput,
  Select,
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
import { stockCategories } from '../../data/mockData';

const StockList = () => {
  const navigate = useNavigate();
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ open: false, stock: null });
  const [deleting, setDeleting] = useState(false);

  // Helper to get id from item (supports both _id and id)
  const getId = (item) => item?._id ?? item?.id;

  useEffect(() => {
    fetchStocks();
  }, []);

  const fetchStocks = async () => {
    try {
      const response = await stockAPI.getAll();
      if (response.success) {
        setStocks(response.data);
      }
    } catch (error) {
      toast.error('Failed to fetch stock');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.stock) return;
    const stockId = getId(deleteModal.stock);
    setDeleting(true);
    try {
      await stockAPI.delete(stockId);
      toast.success('Stock item deleted successfully');
      setStocks(prev => prev.filter(s => getId(s) !== stockId));
      setDeleteModal({ open: false, stock: null });
    } catch (error) {
      toast.error(error.message || 'Failed to delete stock');
    } finally {
      setDeleting(false);
    }
  };

  // Calculate totals
  const totalValue = stocks.reduce((sum, s) => sum + (s.currentQty * s.openingRatePerUnit), 0);
  const lowStockItems = stocks.filter(s => s.currentQty < s.openingStockQty * 0.2).length;

  // Filter stocks
  let filteredStocks = filterBySearch(stocks, search, ['productName', 'category']);
  if (categoryFilter) {
    filteredStocks = filteredStocks.filter(s => s.category === categoryFilter);
  }

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Management"
        subtitle={`${stocks.length} items in inventory`}
        breadcrumbs={[{ label: 'Stock' }]}
        action={
          <Link to="/dashboard/stock/add">
            <Button icon={HiOutlinePlus}>Add Stock Item</Button>
          </Link>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600">
          <div className="text-white">
            <p className="text-emerald-100 text-sm">Total Stock Value</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(totalValue)}</p>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600">
          <div className="text-white">
            <p className="text-blue-100 text-sm">Total Items</p>
            <p className="text-2xl font-bold mt-1">{stocks.length}</p>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500 to-orange-600">
          <div className="text-white">
            <p className="text-orange-100 text-sm">Low Stock Alerts</p>
            <p className="text-2xl font-bold mt-1">{lowStockItems}</p>
          </div>
        </Card>
      </div>

      <Card>
        {/* Search and Filters */}
        <div className="space-y-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search by product name..."
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

          {showFilters && (
            <div className="flex flex-wrap gap-4 p-4 bg-gray-50 rounded-xl">
              <div className="w-full sm:w-64">
                <Select
                  name="category"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  options={stockCategories}
                  placeholder="All Categories"
                />
              </div>
              <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setCategoryFilter(''); }}>
                Clear Filters
              </Button>
            </div>
          )}
        </div>

        {/* Table */}
        <Table>
          <TableHead>
            <TableHeader>Product</TableHeader>
            <TableHeader>Category</TableHeader>
            <TableHeader>Unit</TableHeader>
            <TableHeader>Opening Stock</TableHeader>
            <TableHeader>Current Qty</TableHeader>
            <TableHeader>Rate/Unit</TableHeader>
            <TableHeader>Current Value</TableHeader>
            <TableHeader className="text-right">Actions</TableHeader>
          </TableHead>
          <TableBody>
            {filteredStocks.length === 0 ? (
              <TableEmpty
                message={search || categoryFilter 
                  ? "No stock items match your criteria" 
                  : "No stock items registered yet"
                }
                colSpan={8}
              />
            ) : (
              filteredStocks.map((stock) => {
                const currentValue = stock.currentQty * stock.openingRatePerUnit;
                const isLowStock = stock.currentQty < stock.openingStockQty * 0.2;
                
                return (
                  <TableRow key={stock.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                          <HiOutlineCube className="w-5 h-5 text-blue-600" />
                        </div>
                        <span className="font-medium text-gray-900">{stock.productName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStockCategoryColor(stock.category)}`}>
                        {stock.category}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-gray-600">{stock.unit}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{stock.openingStockQty}</span>
                    </TableCell>
                    <TableCell>
                      <span className={`font-medium ${isLowStock ? 'text-red-600' : 'text-gray-900'}`}>
                        {stock.currentQty}
                        {isLowStock && (
                          <span className="ml-2 text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded">
                            Low Stock
                          </span>
                        )}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-gray-600">{formatCurrency(stock.openingRatePerUnit)}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-emerald-600">{formatCurrency(currentValue)}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => navigate(`/dashboard/stock/${getId(stock)}/edit`)}
                          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <HiOutlinePencil className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => setDeleteModal({ open: true, stock })}
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

        {filteredStocks.length > 0 && (
          <div className="mt-4 text-sm text-gray-500">
            Showing {filteredStocks.length} of {stocks.length} items
          </div>
        )}
      </Card>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, stock: null })}
        onConfirm={handleDelete}
        title="Delete Stock Item"
        message={`Are you sure you want to delete "${deleteModal.stock?.productName}"? This action cannot be undone.`}
        confirmText="Delete"
        loading={deleting}
      />
    </div>
  );
};

export default StockList;
