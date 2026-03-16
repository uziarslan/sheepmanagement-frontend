import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { HiOutlineArrowLeft } from 'react-icons/hi';
import { stockAPI } from '../../services/api';
import {
  PageHeader,
  Card,
  Button,
  Input,
  Select
} from '../../components/common';
import { PageLoader } from '../../components/common/Spinner';

const StockCategoryForm = ({
  category,
  title,
  unit,
  unitLabel,
  showUnitSize = true,
  assetTypes = null,
  defaultPackQuantity = ''
}) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    purchaseDate: '',
    productName: '',
    packQuantity: defaultPackQuantity || '',
    unitSize: showUnitSize ? '' : 1,
    totalPrice: '',
    totalQuantity: 0,
    costPerUnit: 0,
    notes: '',
    assetType: '',
    transportation: '',
    loadingUnloading: ''
  });

  useEffect(() => {
    if (isEdit) {
      fetchStock();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    const qty = parseFloat(formData.packQuantity) || 0;
    const unitSizeVal = showUnitSize ? (parseFloat(formData.unitSize) || 0) : 1;
    const totalQty = qty * unitSizeVal;
    const totalPrice = parseFloat(formData.totalPrice) || 0;
    const costPerUnit = totalQty > 0 ? totalPrice / totalQty : 0;

    setFormData(prev => ({
      ...prev,
      totalQuantity: totalQty,
      costPerUnit
    }));
  }, [formData.packQuantity, formData.unitSize, formData.totalPrice, showUnitSize]);

  const fetchStock = async () => {
    try {
      const response = await stockAPI.getById(id);
      if (response.success) {
        const data = response.data;
        setFormData({
          purchaseDate: data.purchaseDate ? data.purchaseDate.split('T')[0] : '',
          productName: data.productName || '',
          packQuantity: data.packQuantity ?? data.openingStockQty ?? '',
          unitSize: showUnitSize ? (data.unitSize ?? 1) : 1,
          totalPrice: data.totalPrice ?? data.openingStockAmount ?? '',
          totalQuantity: data.totalQuantity ?? data.openingStockQty ?? 0,
          costPerUnit: data.costPerUnit ?? data.openingRatePerUnit ?? 0,
          notes: data.notes || '',
          assetType: data.assetType || ''
        });
      }
    } catch (error) {
      toast.error('Stock item not found');
      navigate('/dashboard/stock');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.purchaseDate) {
      newErrors.purchaseDate = 'Date is required';
    }
    if (!formData.productName.trim()) {
      newErrors.productName = 'Name is required';
    }
    if (!formData.packQuantity || parseFloat(formData.packQuantity) <= 0) {
      newErrors.packQuantity = 'Please enter a valid quantity';
    }
    if (showUnitSize && (!formData.unitSize || parseFloat(formData.unitSize) <= 0)) {
      newErrors.unitSize = `Please enter a valid ${unitLabel}`;
    }
    if (!formData.totalPrice || parseFloat(formData.totalPrice) <= 0) {
      newErrors.totalPrice = 'Please enter a valid total price';
    }
    if (assetTypes && !formData.assetType) {
      newErrors.assetType = 'Please select asset type';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const unitSizeVal = showUnitSize ? parseFloat(formData.unitSize) : 1;
      const totalQuantity = (parseFloat(formData.packQuantity) || 0) * unitSizeVal;
      const totalPrice = parseFloat(formData.totalPrice) || 0;
      const costPerUnit = totalQuantity > 0 ? totalPrice / totalQuantity : 0;

      const dataToSubmit = {
        productName: formData.productName.trim(),
        category,
        unit,
        purchaseDate: formData.purchaseDate,
        packQuantity: parseFloat(formData.packQuantity),
        unitSize: unitSizeVal,
        totalQuantity,
        totalPrice,
        costPerUnit,
        openingStockQty: totalQuantity,
        openingRatePerUnit: costPerUnit,
        minStockLevel: 0,
        notes: formData.notes?.trim() || null
      };
      if (assetTypes && formData.assetType) {
        dataToSubmit.assetType = formData.assetType;
      }
      if (!isEdit) {
        const transport = parseFloat(formData.transportation);
        const loading = parseFloat(formData.loadingUnloading);
        if (!isNaN(transport) && transport > 0) dataToSubmit.transportation = transport;
        if (!isNaN(loading) && loading > 0) dataToSubmit.loadingUnloading = loading;
      }

      if (isEdit) {
        await stockAPI.update(id, dataToSubmit);
        toast.success('Stock item updated successfully');
      } else {
        await stockAPI.create(dataToSubmit);
        toast.success('Stock item added successfully');
      }
      navigate(`/dashboard/stock/${category.toLowerCase().replace(/\s+/g, '-')}`);
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
        title={isEdit ? `Edit ${title}` : `Add ${title}`}
        subtitle={isEdit ? `Editing ${formData.productName}` : `Register a new ${title.toLowerCase()}`}
        breadcrumbs={[
          { label: 'Stock', path: '/dashboard/stock' },
          { label: title, path: `/dashboard/stock/${category.toLowerCase().replace(/\s+/g, '-')}` },
          { label: isEdit ? 'Edit' : 'Add New' }
        ]}
        action={
          <Button
            variant="ghost"
            icon={HiOutlineArrowLeft}
            onClick={() => navigate(`/dashboard/stock/${category.toLowerCase().replace(/\s+/g, '-')}`)}
          >
            Back to List
          </Button>
        }
      />

      <form onSubmit={handleSubmit}>
        <Card className="max-w-2xl">
          <h3 className="text-lg font-semibold text-gray-800 mb-6">{title} Details</h3>

          <div className="space-y-4">
            <Input
              label="Date"
              type="date"
              name="purchaseDate"
              value={formData.purchaseDate}
              onChange={handleChange}
              error={errors.purchaseDate}
              required
            />

            <Input
              label="Name"
              name="productName"
              value={formData.productName}
              onChange={handleChange}
              placeholder={assetTypes ? 'e.g., Main Shed, Tractor' : 'e.g., Albendazole'}
              error={errors.productName}
              required
            />

            {assetTypes && (
              <Select
                label="Asset Type"
                name="assetType"
                value={formData.assetType}
                onChange={handleChange}
                options={assetTypes}
                placeholder="Select asset type"
                error={errors.assetType}
                required
              />
            )}

            <Input
              label="Quantity"
              type="number"
              name="packQuantity"
              value={formData.packQuantity}
              onChange={handleChange}
              placeholder="e.g., 10"
              error={errors.packQuantity}
              required
            />

            {showUnitSize && (
              <Input
                label={`${unitLabel}`}
                type="number"
                name="unitSize"
                value={formData.unitSize}
                onChange={handleChange}
                placeholder={`e.g., 100 ${unit}`}
                error={errors.unitSize}
                required
              />
            )}

            <Input
              label="Total Quantity (calculated)"
              type="number"
              name="totalQuantity"
              value={formData.totalQuantity}
              disabled
            />

            <Input
              label="Total Price"
              type="number"
              name="totalPrice"
              value={formData.totalPrice}
              onChange={handleChange}
              placeholder="e.g., 5000"
              error={errors.totalPrice}
              required
            />

            <Input
              label={`Cost Per ${unit} (calculated)`}
              type="number"
              name="costPerUnit"
              value={formData.costPerUnit}
              disabled
            />

            {!isEdit && (
              <>
                <p className="text-sm font-medium text-gray-700 pt-2">Additional expenses (optional)</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Transportation (Rs.)"
                    type="number"
                    name="transportation"
                    value={formData.transportation}
                    onChange={handleChange}
                    placeholder="e.g., 500"
                    min={0}
                  />
                  <Input
                    label="Loading / Unloading (Rs.)"
                    type="number"
                    name="loadingUnloading"
                    value={formData.loadingUnloading}
                    onChange={handleChange}
                    placeholder="e.g., 200"
                    min={0}
                  />
                </div>
                {((parseFloat(formData.transportation) || 0) + (parseFloat(formData.loadingUnloading) || 0)) > 0 && (
                  <p className="text-sm text-gray-600">
                    Total cost to deduct: Rs.{((parseFloat(formData.totalPrice) || 0) + (parseFloat(formData.transportation) || 0) + (parseFloat(formData.loadingUnloading) || 0)).toLocaleString()}
                  </p>
                )}
              </>
            )}

            <Input
              label="Notes (optional)"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Optional notes"
            />
          </div>

          <div className="flex justify-end gap-4 mt-8">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate(`/dashboard/stock/${category.toLowerCase().replace(/\s+/g, '-')}`)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {isEdit ? 'Update' : 'Add'} {title}
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
};

export default StockCategoryForm;
