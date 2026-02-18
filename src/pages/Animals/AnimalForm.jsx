import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { HiOutlineArrowLeft } from 'react-icons/hi';
import { animalAPI, penAPI } from '../../services/mockApi';
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
      console.error('Error fetching pens:', error);
    }
  };

  const fetchAnimal = async () => {
    try {
      const response = await animalAPI.getById(id);
      if (response.success) {
        const animal = response.data;
        setFormData({
          ...animal,
          arrivalDate: animal.arrivalDate?.split('T')[0] || '',
          birthDate: animal.birthDate?.split('T')[0] || '',
          weightDate: animal.weightDate?.split('T')[0] || ''
        });
      }
    } catch (error) {
      toast.error('Animal not found');
      navigate('/dashboard/animals');
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
    if (!formData.sex) {
      newErrors.sex = 'Sex is required';
    }
    if (!formData.purchasePrice || parseFloat(formData.purchasePrice) <= 0) {
      newErrors.purchasePrice = 'Please enter a valid purchase price';
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
      // Only send fields the backend accepts (pen not penId, no picture)
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
        purchasePrice: parseFloat(formData.purchasePrice),
        weight: parseFloat(formData.weight),
        weightDate: formData.weightDate || undefined,
        pen: penValue || null,
        status: formData.status || 'Active',
        pedigreeInfo: Boolean(formData.pedigreeInfo),
        notes: formData.notes?.trim() || null
      };

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

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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

          {/* Photo Upload */}
          {/* <Card>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Animal Photo</h3>
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-8 hover:border-emerald-500 transition-colors cursor-pointer">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <HiOutlineCamera className="w-10 h-10 text-gray-400" />
              </div>
              <p className="text-sm text-gray-600 text-center">
                Click to upload or drag and drop
              </p>
              <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 5MB</p>
              <input type="file" className="hidden" accept="image/*" />
            </div>

            <div className="mt-6">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="pedigreeInfo"
                  checked={formData.pedigreeInfo}
                  onChange={handleChange}
                  className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                />
                <span className="text-sm text-gray-700">Has Pedigree Information</span>
              </label>
            </div>
          </Card> */}

          {/* Purchase Info */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Purchase Information</h3>
            
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
                required
              />
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
                label="Weight"
                type="number"
                name="weight"
                value={formData.weight}
                onChange={handleChange}
                placeholder="Enter weight"
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
