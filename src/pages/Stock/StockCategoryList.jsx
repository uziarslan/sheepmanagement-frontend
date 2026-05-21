import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  HiOutlinePlus,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineCube,
  HiOutlineCloudUpload
} from 'react-icons/hi';
import { stockAPI } from '../../services/api';
import { formatCurrency, filterBySearch } from '../../utils/helpers';
import {
  PageHeader,
  Card,
  Button,
  SearchInput,
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

const StockCategoryList = ({
  category,
  title,
  subtitle,
  addPath,
  bulkUploadPath,
  showAssetType = false
}) => {
  const navigate = useNavigate();
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteModal, setDeleteModal] = useState({ open: false, stock: null });
  const [deleting, setDeleting] = useState(false);

  const getId = (item) => item?._id ?? item?.id;

  // Server-side search: when the user types, refetch matching stocks so
  // results aren't limited to the first 100-record page. Debounced 300ms.
  // Also covers the initial load and category changes.
  useEffect(() => {
    const id = setTimeout(() => {
      fetchStocks(search.trim());
    }, 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, category]);

  const fetchStocks = async (term = '') => {
    try {
      // Backend caps stock listing at 100 records per request; server-side
      // search keeps results relevant even when the inventory exceeds that.
      const params = { category, limit: 100 };
      if (term) params.search = term;
      const response = await stockAPI.getAll(params);
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

  const totalValue = stocks.reduce((sum, s) => sum + (s.currentQty * s.openingRatePerUnit), 0);
  const lowStockItems = stocks.filter(s => s.currentQty < s.openingStockQty * 0.2).length;

  let filteredStocks = filterBySearch(stocks, search, ['productName']);

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        subtitle={subtitle || `${stocks.length} items in inventory`}
        breadcrumbs={[
          { label: 'Stock', path: '/dashboard/stock' },
          { label: title }
        ]}
        action={
          <div className="flex items-center gap-2">
            {bulkUploadPath && (
              <Link to={bulkUploadPath}>
                <Button variant="outline" icon={HiOutlineCloudUpload}>Bulk Upload</Button>
              </Link>
            )}
            <Link to={addPath}>
              <Button icon={HiOutlinePlus}>Add {title}</Button>
            </Link>
          </div>
        }
      />

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
        <div className="mb-6">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by product name..."
          />
        </div>

        <Table>
          <TableHead>
            <TableHeader>Date</TableHeader>
            <TableHeader>Product</TableHeader>
            {showAssetType && <TableHeader>Type</TableHeader>}
            <TableHeader>Quantity</TableHeader>
            <TableHeader>Unit Size</TableHeader>
            <TableHeader>Total Qty</TableHeader>
            <TableHeader>Total Price</TableHeader>
            <TableHeader>Cost/Unit</TableHeader>
            <TableHeader>Current Qty</TableHeader>
            <TableHeader className="text-right">Actions</TableHeader>
          </TableHead>
          <TableBody>
            {filteredStocks.length === 0 ? (
              <TableEmpty
                message={search ? 'No stock items match your search' : 'No stock items registered yet'}
                colSpan={showAssetType ? 10 : 9}
              />
            ) : (
              filteredStocks.map((stock) => {
                const totalQty = stock.totalQuantity ?? stock.openingStockQty ?? 0;
                const unitSize = stock.unitSize ?? '-';
                const totalPrice = stock.totalPrice ?? stock.openingStockAmount ?? (stock.openingStockQty * stock.openingRatePerUnit);
                const costPerUnit = stock.costPerUnit ?? stock.openingRatePerUnit ?? 0;

                return (
                  <TableRow key={getId(stock)}>
                    <TableCell>
                      <span className="text-sm text-gray-600">
                        {stock.purchaseDate ? new Date(stock.purchaseDate).toLocaleDateString() : '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
                          <HiOutlineCube className="w-5 h-5 text-blue-600" />
                        </div>
                        <span className="font-medium text-gray-900">{stock.productName}</span>
                      </div>
                    </TableCell>
                    {showAssetType && (
                      <TableCell>
                        <span className="text-sm text-gray-700">{stock.assetType || '-'}</span>
                      </TableCell>
                    )}
                    <TableCell>{stock.packQuantity ?? '-'}</TableCell>
                    <TableCell>{unitSize === '-' ? '-' : `${unitSize} ${stock.unit || ''}`}</TableCell>
                    <TableCell>{totalQty} {stock.unit}</TableCell>
                    <TableCell>{formatCurrency(totalPrice)}</TableCell>
                    <TableCell>{formatCurrency(costPerUnit)} / {stock.unit}</TableCell>
                    <TableCell>{stock.currentQty} {stock.unit}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={HiOutlinePencil}
                          onClick={() => navigate(`/dashboard/stock/${getId(stock)}/edit`)}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={HiOutlineTrash}
                          onClick={() => setDeleteModal({ open: true, stock })}
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

export default StockCategoryList;
