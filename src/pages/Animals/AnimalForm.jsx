import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { HiOutlineArrowLeft, HiOutlineRefresh } from 'react-icons/hi';
import { animalAPI, penAPI } from '../../services/api';
import { formatCurrency } from '../../utils/helpers';
import {
  PageHeader,
  Card,
  Button,
  Input,
  Select,
  Textarea
} from '../../components/common';
import { PageLoader } from '../../components/common/Spinner';
import {
  animalTypes,
  breedTypes,
  animalSubcategories,
  sexOptions,
  countries,
  animalStatuses
} from '../../data/mockData';

const AnimalForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [pens, setPens] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [restoring, setRestoring] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState(null); // 'dead' | 'sold' | null
  
  const [formData, setFormData] = useState({
    tagId: '',
    electronicId: '',
    name: '',
    animalType: '',
    breedType: '',
    subcategory: '',
    sex: '',
    purchasedFrom: 'Pakistan',
    arrivalDate: '',
    birthDate: '',
    purchasePrice: '',
    purchaseTransport: '',
    purchaseMandiExpenses: '',
    purchaseFuel: '',
    purchaseFood: '',
    purchaseHotel: '',
    buyingWeight: '',
    weight: '',
    weightDate: '',
    penId: '',
    status: 'Active',
    pedigreeInfo: false,
    picture: null,
    notes: ''
  });

  useEffect(() => {
    fetchPens();
    if (isEdit) {
      fetchAnimal();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchPens = async () => {
    try {
      const response = await penAPI.getAll();
      if (response.success) {
        setPens(response.data);
      }
    } catch (error) {
      if (typeof console !== 'undefined' && console.error) {
        console.error('Error fetching pens:', error);
      }
    }
  };

  const fetchAnimal = async () => {
    try {
      const response = await animalAPI.getById(id);
      if (response.success) {
        const animal = response.data;
        setFormData({
          ...animal,
          penId: animal.pen?._id || animal.pen || '',
          arrivalDate: animal.arrivalDate?.split('T')[0] || '',
          birthDate: animal.birthDate?.split('T')[0] || '',
          weightDate: animal.weightDate?.split('T')[0] || '',
          purchaseTransport: animal.purchaseTransport ?? '',
          purchaseMandiExpenses: animal.purchaseMandiExpenses ?? '',
          purchaseFuel: animal.purchaseFuel ?? '',
          purchaseFood: animal.purchaseFood ?? '',
          purchaseHotel: animal.purchaseHotel ?? ''
        });
      }
    } catch (error) {
      toast.error('Animal not found');
      navigate('/dashboard/animals');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!confirmRestore) return;
    setRestoring(true);
    try {
      if (confirmRestore === 'dead') {
        await animalAPI.restoreFromDead(id);
      } else {
        await animalAPI.restoreFromSold(id);
      }
      toast.success('Animal restored to Active successfully');
      setConfirmRestore(null);
      await fetchAnimal();
    } catch (error) {
      toast.error(error.message || 'Failed to restore animal');
    } finally {
      setRestoring(false);
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

    if (!formData.tagId.trim()) {
      newErrors.tagId = 'Tag ID is required';
    }
    if (!formData.name.trim()) {
      newErrors.name = 'Animal name is required';
    }
    if (!formData.animalType) {
      newErrors.animalType = 'Animal type is required';
    }
    if (!formData.breedType) {
      newErrors.breedType = 'Breed type is required';
    }
    if (!formData.subcategory) {
      newErrors.subcategory = 'Subcategory is required';
    }
    if (!formData.sex) {
      newErrors.sex = 'Sex is required';
    }
    if (!formData.purchasePrice || parseFloat(formData.purchasePrice) <= 0) {
      newErrors.purchasePrice = 'Please enter a valid purchase price';
    }
    // Buying weight is required for new animals, optional for editing existing ones
    if (!isEdit && (!formData.buyingWeight || parseFloat(formData.buyingWeight) <= 0)) {
      newErrors.buyingWeight = 'Please enter a valid buying weight';
    }
    if (formData.buyingWeight && parseFloat(formData.buyingWeight) <= 0) {
      newErrors.buyingWeight = 'Buying weight must be greater than 0';
    }
    if (!formData.weight || parseFloat(formData.weight) <= 0) {
      newErrors.weight = 'Please enter a valid weight';
    }
    if (!formData.penId) {
      newErrors.penId = 'Please select a pen';
    }
    if (!formData.arrivalDate) {
      newErrors.arrivalDate = 'Arrival date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      // Only send fields the backend accepts (pen not penId, no picture).
      const penValue = formData.penId ? String(formData.penId).trim() : null;
      const dataToSubmit = {
        tagId: formData.tagId?.trim() || undefined,
        electronicId: formData.electronicId?.trim() || null,
        name: formData.name?.trim() || null,
        animalType: formData.animalType,
        breedType: formData.breedType,
        subcategory: formData.subcategory,
        sex: formData.sex,
        purchasedFrom: formData.purchasedFrom || 'Pakistan',
        arrivalDate: formData.arrivalDate,
        birthDate: formData.birthDate || null,
        weight: parseFloat(formData.weight),
        weightDate: formData.weightDate || undefined,
        pen: penValue || null,
        status: formData.status || 'Active',
        pedigreeInfo: Boolean(formData.pedigreeInfo),
        notes: formData.notes?.trim() || null
      };

      // Include buyingWeight if provided
      if (formData.buyingWeight && parseFloat(formData.buyingWeight) > 0) {
        dataToSubmit.buyingWeight = parseFloat(formData.buyingWeight);
      }

      // Purchase price + purchasing expenses are ONLY accepted on CREATE. The
      // update endpoint rejects them (changing a purchase cost needs a synced
      // capital adjustment, which isn't supported), and sending them on edit
      // used to make every update fail with a 400 (audit C-4).
      if (!isEdit) {
        dataToSubmit.purchasePrice = parseFloat(formData.purchasePrice);
        dataToSubmit.purchaseTransport = Number(formData.purchaseTransport) || 0;
        dataToSubmit.purchaseMandiExpenses = Number(formData.purchaseMandiExpenses) || 0;
        dataToSubmit.purchaseFuel = Number(formData.purchaseFuel) || 0;
        dataToSubmit.purchaseFood = Number(formData.purchaseFood) || 0;
        dataToSubmit.purchaseHotel = Number(formData.purchaseHotel) || 0;
      }

      if (isEdit) {
        await animalAPI.update(id, dataToSubmit);
        toast.success('Animal updated successfully');
      } else {
        await animalAPI.create(dataToSubmit);
        toast.success('Animal added successfully');
      }
      navigate('/dashboard/animals');
    } catch (error) {
      toast.error(error.message || 'Failed to save animal');
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
        title={isEdit ? 'Edit Animal' : 'Add New Animal'}
        subtitle={isEdit ? `Editing ${formData.name}` : 'Register a new animal to the farm'}
        breadcrumbs={[
          { label: 'Animals', path: '/dashboard/animals' },
          { label: isEdit ? 'Edit' : 'Add New' }
        ]}
        action={
          <Button
            variant="ghost"
            icon={HiOutlineArrowLeft}
            onClick={() => navigate('/dashboard/animals')}
          >
            Back to List
          </Button>
        }
      />

      {/* Status banner for Dead / Sold animals */}
      {isEdit && formData.status === 'Dead' && (
        <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-xl px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-red-700">This animal is marked as Dead</p>
            <p className="text-xs text-red-500 mt-0.5">Restoring will reverse the capital loss and set the animal back to Active.</p>
          </div>
          <button
            type="button"
            onClick={() => setConfirmRestore('dead')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors"
          >
            <HiOutlineRefresh className="w-4 h-4" />
            Restore to Active
          </button>
        </div>
      )}

      {isEdit && formData.status === 'Sold' && (
        <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-blue-700">This animal is marked as Sold</p>
            <p className="text-xs text-blue-500 mt-0.5">Restoring will reverse the sale profit/loss in capital and set the animal back to Active.</p>
          </div>
          <button
            type="button"
            onClick={() => setConfirmRestore('sold')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <HiOutlineRefresh className="w-4 h-4" />
            Restore to Active
          </button>
        </div>
      )}

      {/* Confirm restore dialog */}
      {confirmRestore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Restore Animal?
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              {confirmRestore === 'dead'
                ? 'This will reverse the death loss recorded in capital and set the animal back to Active. This cannot be undone without re-declaring the animal dead.'
                : 'This will reverse the sale profit/loss recorded in capital and set the animal back to Active. This cannot be undone without re-marking the animal as sold.'}
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmRestore(null)}
                disabled={restoring}
                className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRestore}
                disabled={restoring}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                {restoring && (
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                {restoring ? 'Restoring...' : 'Yes, Restore'}
              </button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {isEdit && formData.status === 'Sold' && (
            <Card className="lg:col-span-3 border-blue-200 bg-blue-50">
              <h3 className="text-lg font-semibold text-blue-800 mb-4">Sale Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-white rounded-xl border border-blue-100">
                  <p className="text-sm text-blue-500">Selling Price</p>
                  <p className="text-2xl font-bold text-blue-700">
                    {formData.soldPrice != null ? formatCurrency(formData.soldPrice) : '—'}
                  </p>
                </div>
                <div className="p-4 bg-white rounded-xl border border-blue-100">
                  <p className="text-sm text-blue-500">Selling Cost</p>
                  <p className="text-2xl font-bold text-blue-700">
                    {formData.soldCost != null ? formatCurrency(formData.soldCost) : '—'}
                  </p>
                </div>
                <div className="p-4 bg-white rounded-xl border border-blue-100">
                  <p className="text-sm text-blue-500">Sold Date</p>
                  <p className="text-2xl font-bold text-blue-700">
                    {formData.soldDate ? new Date(formData.soldDate).toLocaleDateString() : '—'}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Main Info */}
          <Card className="lg:col-span-2">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Basic Information</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Tag ID"
                name="tagId"
                value={formData.tagId}
                onChange={handleChange}
                placeholder="e.g., SHP-001"
                error={errors.tagId}
                required
              />
              <Input
                label="Electronic ID (RFID)"
                name="electronicId"
                value={formData.electronicId}
                onChange={handleChange}
                placeholder="e.g., RFID-0001"
              />
              <Input
                label="Animal Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter animal name"
                error={errors.name}
                required
              />
              <Select
                label="Animal Type"
                name="animalType"
                value={formData.animalType}
                onChange={handleChange}
                options={animalTypes}
                placeholder="Select type"
                error={errors.animalType}
                required
              />
              <Select
                label="Breed Type"
                name="breedType"
                value={formData.breedType}
                onChange={handleChange}
                options={breedTypes}
                placeholder="Select breed"
                error={errors.breedType}
                required
              />
              <Select
                label="Subcategory"
                name="subcategory"
                value={formData.subcategory}
                onChange={handleChange}
                options={animalSubcategories}
                placeholder="Select subcategory"
                error={errors.subcategory}
                required
              />
              <Select
                label="Sex"
                name="sex"
                value={formData.sex}
                onChange={handleChange}
                options={sexOptions}
                placeholder="Select sex"
                error={errors.sex}
                required
              />
              <Select
                label="Purchased From"
                name="purchasedFrom"
                value={formData.purchasedFrom}
                onChange={handleChange}
                options={countries}
                placeholder="Select country"
              />
            </div>
          </Card>

          {/* Purchase Info */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Purchase Information</h3>

            {isEdit && (
              <p className="text-xs text-gray-500 mb-3 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                Purchase price &amp; purchasing expenses are locked after creation — they're tied to a recorded capital transaction and can't be edited here.
              </p>
            )}

            <div className="space-y-4">
              <Input
                label="Purchase Price"
                type="number"
                name="purchasePrice"
                value={formData.purchasePrice}
                onChange={handleChange}
                placeholder="Enter price"
                prefix="Rs."
                error={errors.purchasePrice}
                required={!isEdit}
                disabled={isEdit}
              />
              <p className="text-sm font-medium text-gray-700 mt-4 mb-2">Purchasing Expenses (optional)</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Transport"
                  type="number"
                  name="purchaseTransport"
                  value={formData.purchaseTransport}
                  onChange={handleChange}
                  placeholder="0"
                  prefix="Rs."
                  min={0}
                  disabled={isEdit}
                />
                <Input
                  label="Mandi Expenses"
                  type="number"
                  name="purchaseMandiExpenses"
                  value={formData.purchaseMandiExpenses}
                  onChange={handleChange}
                  placeholder="0"
                  prefix="Rs."
                  min={0}
                  disabled={isEdit}
                />
                <Input
                  label="Fuel"
                  type="number"
                  name="purchaseFuel"
                  value={formData.purchaseFuel}
                  onChange={handleChange}
                  placeholder="0"
                  prefix="Rs."
                  min={0}
                  disabled={isEdit}
                />
                <Input
                  label="Food"
                  type="number"
                  name="purchaseFood"
                  value={formData.purchaseFood}
                  onChange={handleChange}
                  placeholder="0"
                  prefix="Rs."
                  min={0}
                  disabled={isEdit}
                />
                <Input
                  label="Hotel"
                  type="number"
                  name="purchaseHotel"
                  value={formData.purchaseHotel}
                  onChange={handleChange}
                  placeholder="0"
                  prefix="Rs."
                  min={0}
                  disabled={isEdit}
                />
              </div>
              {(() => {
                const exp =
                  (parseFloat(formData.purchaseTransport) || 0) +
                  (parseFloat(formData.purchaseMandiExpenses) || 0) +
                  (parseFloat(formData.purchaseFuel) || 0) +
                  (parseFloat(formData.purchaseFood) || 0) +
                  (parseFloat(formData.purchaseHotel) || 0);
                const total = (parseFloat(formData.purchasePrice) || 0) + exp;
                if (exp > 0) {
                  return (
                    <p className="text-sm text-emerald-600 font-medium">
                      Total cost (price + expenses): Rs. {total.toLocaleString()}
                    </p>
                  );
                }
                return null;
              })()}
              <Input
                label="Arrival Date"
                type="date"
                name="arrivalDate"
                value={formData.arrivalDate}
                onChange={handleChange}
                error={errors.arrivalDate}
                required
              />
              <Input
                label="Birth Date"
                type="date"
                name="birthDate"
                value={formData.birthDate}
                onChange={handleChange}
              />
            </div>
          </Card>

          {/* Weight & Pen */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Weight & Location</h3>
            
            <div className="space-y-4">
              <Input
                label="Buying Weight (at purchase)"
                type="number"
                name="buyingWeight"
                value={formData.buyingWeight}
                onChange={handleChange}
                placeholder="Enter buying weight"
                suffix="kg"
                error={errors.buyingWeight}
                required={!isEdit}
              />
              <Input
                label="Current Weight"
                type="number"
                name="weight"
                value={formData.weight}
                onChange={handleChange}
                placeholder="Enter current weight"
                suffix="kg"
                error={errors.weight}
                required
              />
              <Input
                label="Weight Date"
                type="date"
                name="weightDate"
                value={formData.weightDate}
                onChange={handleChange}
              />
              <Select
                label="Assign to Pen"
                name="penId"
                value={formData.penId}
                onChange={handleChange}
                options={pens.map(p => ({ value: p._id || p.id, label: p.name }))}
                placeholder="Select pen"
                error={errors.penId}
                required
              />
              {isEdit && (
                <Select
                  label="Status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  options={animalStatuses}
                  placeholder="Select status"
                />
              )}
            </div>
          </Card>

          {/* Notes */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Additional Notes</h3>
            <Textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Enter any additional notes about the animal..."
              rows={5}
            />
          </Card>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-4 mt-6">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate('/dashboard/animals')}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            loading={submitting}
          >
            {isEdit ? 'Update Animal' : 'Add Animal'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AnimalForm;
