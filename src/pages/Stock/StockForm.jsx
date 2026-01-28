import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { HiOutlineArrowLeft } from 'react-icons/hi';
import { stockAPI } from '../../services/mockApi';
import { formatCurrency } from '../../utils/helpers';
import {
  PageHeader,
  Card,
  Button,
  Input,
  Select
} from '../../components/common';
import { PageLoader } from '../../components/common/Spinner';
import { stockCategories, stockUnits } from '../../data/mockData';

const StockForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  
  const [formData, setFormData] = useState({
    productName: '',
    category: '',
    unit: '',
    isStockItem: true,
    openingStockQty: '',
    openingRatePerUnit: '',
    openingStockAmount: 0
  });

  useEffect(() => {
    if (isEdit) {
      fetchStock();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    // Calculate opening stock amount
    const qty = parseFloat(formData.openingStockQty) || 0;
    const rate = parseFloat(formData.openingRatePerUnit) || 0;
    setFormData(prev => ({
      ...prev,
      openingStockAmount: qty * rate
    }));
  }, [formData.openingStockQty, formData.openingRatePerUnit]);

  const fetchStock = async () => {
    try {
      const response = await stockAPI.getById(id);
      if (response.success) {
        setFormData(response.data);
      }
    } catch (error) {
      toast.error('Stock item not found');
      navigate('/dashboard/stock');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.productName.trim()) {
      newErrors.productName = 'Product name is required';
    }
    if (!formData.category) {
      newErrors.category = 'Category is required';
    }
    if (!formData.unit) {
      newErrors.unit = 'Unit is required';
    }
    if (!formData.openingStockQty || parseFloat(formData.openingStockQty) < 0) {
      newErrors.openingStockQty = 'Please enter a valid quantity';
    }
    if (!formData.openingRatePerUnit || parseFloat(formData.openingRatePerUnit) <= 0) {
      newErrors.openingRatePerUnit = 'Please enter a valid rate';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const dataToSubmit = {
        ...formData,
        openingStockQty: parseFloat(formData.openingStockQty),
        openingRatePerUnit: parseFloat(formData.openingRatePerUnit)
      };

      if (isEdit) {
        await stockAPI.update(id, dataToSubmit);
        toast.success('Stock item updated successfully');
      } else {
        await stockAPI.create(dataToSubmit);
        toast.success('Stock item added successfully');
      }
      navigate('/dashboard/stock');
    } catch (error) {
      toast.error(error.message || 'Failed to save stock item');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={isEdit ? 'Edit Stock Item' : 'Add Stock Item'}
        subtitle={isEdit ? `Editing ${formData.productName}` : 'Register a new stock item'}
        breadcrumbs={[
          { label: 'Stock', path: '/dashboard/stock' },
          { label: isEdit ? 'Edit' : 'Add New' }
        ]}
        action={
          <Button
            variant="ghost"
            icon={HiOutlineArrowLeft}
            onClick={() => navigate('/dashboard/stock')}
          >
            Back to List
          </Button>
        }
      />

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Info */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-800 mb-6">Product Information</h3>
            
            <div className="space-y-4">
              <Input
                label="Product Name"
                name="productName"
                value={formData.productName}
                onChange={handleChange}
                placeholder="e.g., Wheat Bran"
                error={errors.productName}
                required
              />

              <Select
                label="Category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                options={stockCategories}
                placeholder="Select category"
                error={errors.category}
                required
              />

              <Select
                label="Unit"
                name="unit"
                value={formData.unit}
                onChange={handleChange}
                options={stockUnits}
                placeholder="Select unit"
                error={errors.unit}
                required
              />

              <label className="flex items-center space-x-3 cursor-pointer pt-2">
                <input
                  type="checkbox"
                  name="isStockItem"
                  checked={formData.isStockItem}
                  onChange={handleChange}
                  className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                />
                <span className="text-sm text-gray-700">Is Stock Item (Track inventory)</span>
              </label>
            </div>
          </Card>

          {/* Stock Details */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-800 mb-6">Stock Details</h3>
            
            <div className="space-y-4">
              <Input
                label="Opening Stock Quantity"
                type="number"
                name="openingStockQty"
                value={formData.openingStockQty}
                onChange={handleChange}
                placeholder="Enter quantity"
                suffix={formData.unit || 'units'}
                error={errors.openingStockQty}
                required
              />

              <Input
                label="Rate per Unit"
                type="number"
                name="openingRatePerUnit"
                value={formData.openingRatePerUnit}
                onChange={handleChange}
                placeholder="Enter rate"
                prefix="Rs."
                error={errors.openingRatePerUnit}
                required
              />

              {/* Calculated Amount */}
              <div className="p-4 bg-emerald-50 rounded-xl">
                <p className="text-sm text-emerald-600 mb-1">Opening Stock Amount</p>
                <p className="text-2xl font-bold text-emerald-700">
                  {formatCurrency(formData.openingStockAmount)}
                </p>
                <p className="text-xs text-emerald-500 mt-1">
                  {formData.openingStockQty || 0} {formData.unit || 'units'} × {formatCurrency(formData.openingRatePerUnit || 0)}
                </p>
              </div>

              {/* Category Info */}
              {formData.category && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-700 mb-1">Category: {formData.category}</p>
                  <p className="text-sm text-gray-500">
                    {formData.category === 'Feeding' && 'Animal feed and nutrition products.'}
                    {formData.category === 'Medication' && 'Medicines, vaccines, and health products.'}
                    {formData.category === 'Semen' && 'Breeding and artificial insemination supplies.'}
                    {formData.category === 'Seeds' && 'Fodder and crop seeds.'}
                    {formData.category === 'Fertilizers' && 'Fertilizers for farm and fodder cultivation.'}
                    {formData.category === 'Pesticides' && 'Pest control and protection products.'}
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-4 mt-6">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate('/dashboard/stock')}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            loading={submitting}
          >
            {isEdit ? 'Update Stock' : 'Add Stock'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default StockForm;
