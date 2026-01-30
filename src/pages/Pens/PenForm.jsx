import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { HiOutlineArrowLeft } from 'react-icons/hi';
import { penAPI } from '../../services/mockApi';
import {
  PageHeader,
  Card,
  Button,
  Input,
  Select
} from '../../components/common';
import { PageLoader } from '../../components/common/Spinner';
import { penTypes } from '../../data/mockData';

const PenForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    minWeightAvg: '',
    maxWeightAvg: '',
    capacity: ''
  });

  useEffect(() => {
    if (isEdit) {
      fetchPen();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchPen = async () => {
    try {
      const response = await penAPI.getById(id);
      if (response.success) {
        setFormData(response.data);
      }
    } catch (error) {
      toast.error('Pen not found');
      navigate('/dashboard/pens');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Pen name is required';
    }
    if (!formData.type) {
      newErrors.type = 'Pen type is required';
    }
    if (!formData.minWeightAvg || parseFloat(formData.minWeightAvg) < 0) {
      newErrors.minWeightAvg = 'Please enter a valid minimum weight';
    }
    if (!formData.maxWeightAvg || parseFloat(formData.maxWeightAvg) < 0) {
      newErrors.maxWeightAvg = 'Please enter a valid maximum weight';
    }
    if (parseFloat(formData.minWeightAvg) >= parseFloat(formData.maxWeightAvg)) {
      newErrors.maxWeightAvg = 'Maximum weight must be greater than minimum weight';
    }
    if (!formData.capacity || parseInt(formData.capacity) <= 0) {
      newErrors.capacity = 'Please enter a valid capacity';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      // Only send fields the backend accepts (exclude createdBy, createdAt, updatedAt, occupancyPercentage, id, animalCount)
      const dataToSubmit = {
        name: formData.name.trim(),
        type: formData.type,
        capacity: parseInt(formData.capacity, 10),
        minWeightAvg: parseFloat(formData.minWeightAvg),
        maxWeightAvg: parseFloat(formData.maxWeightAvg),
        description: formData.description?.trim() || null,
        location: formData.location?.trim() || null
      };
      if (isEdit) {
        if (formData.isActive !== undefined) dataToSubmit.isActive = formData.isActive;
        await penAPI.update(id, dataToSubmit);
        toast.success('Pen updated successfully');
      } else {
        await penAPI.create(dataToSubmit);
        toast.success('Pen created successfully');
      }
      navigate('/dashboard/pens');
    } catch (error) {
      toast.error(error.message || 'Failed to save pen');
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
        title={isEdit ? 'Edit Pen' : 'Add New Pen'}
        subtitle={isEdit ? `Editing ${formData.name}` : 'Create a new pen for animal management'}
        breadcrumbs={[
          { label: 'Pens', path: '/dashboard/pens' },
          { label: isEdit ? 'Edit' : 'Add New' }
        ]}
        action={
          <Button
            variant="ghost"
            icon={HiOutlineArrowLeft}
            onClick={() => navigate('/dashboard/pens')}
          >
            Back to List
          </Button>
        }
      />

      <form onSubmit={handleSubmit}>
        <Card className="max-w-2xl">
          <h3 className="text-lg font-semibold text-gray-800 mb-6">Pen Details</h3>
          
          <div className="space-y-4">
            <Input
              label="Pen Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., Pen A - Fattening 1"
              error={errors.name}
              required
            />

            <Select
              label="Pen Type"
              name="type"
              value={formData.type}
              onChange={handleChange}
              options={penTypes}
              placeholder="Select pen type"
              error={errors.type}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Minimum Weight Average"
                type="number"
                name="minWeightAvg"
                value={formData.minWeightAvg}
                onChange={handleChange}
                placeholder="e.g., 25"
                suffix="kg"
                error={errors.minWeightAvg}
                required
              />

              <Input
                label="Maximum Weight Average"
                type="number"
                name="maxWeightAvg"
                value={formData.maxWeightAvg}
                onChange={handleChange}
                placeholder="e.g., 50"
                suffix="kg"
                error={errors.maxWeightAvg}
                required
              />
            </div>

            <Input
              label="Capacity"
              type="number"
              name="capacity"
              value={formData.capacity}
              onChange={handleChange}
              placeholder="Maximum number of animals"
              suffix="animals"
              error={errors.capacity}
              required
            />

            {/* Type Description */}
            {formData.type && (
              <div className="p-4 bg-emerald-50 rounded-lg">
                <p className="text-sm font-medium text-emerald-800 mb-1">
                  {formData.type} Pen
                </p>
                <p className="text-sm text-emerald-600">
                  {formData.type === 'Fattening' && 'Used for animals in the fattening stage for meat production.'}
                  {formData.type === 'Production' && 'Used for breeding animals in active production.'}
                  {formData.type === 'Quarantine' && 'Isolation pen for new arrivals or sick animals.'}
                  {formData.type === 'Heifer' && 'For young female animals not yet bred.'}
                  {formData.type === 'Dry' && 'For animals in the dry period before calving.'}
                  {formData.type === 'Close-up' && 'For animals close to calving date.'}
                </p>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-4 mt-8 pt-6 border-t">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/dashboard/pens')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={submitting}
            >
              {isEdit ? 'Update Pen' : 'Create Pen'}
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
};

export default PenForm;
