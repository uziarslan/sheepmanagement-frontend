import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  HiOutlineArrowLeft,
  HiOutlinePlay,
  HiOutlineShieldCheck
} from 'react-icons/hi';
import { vaccinationAPI, penAPI, animalAPI } from '../../services/api';
import { formatCurrency } from '../../utils/helpers';
import {
  PageHeader,
  Card,
  Button,
  Input,
  Select,
  Textarea,
  Badge
} from '../../components/common';
import { PageLoader } from '../../components/common/Spinner';

const ApplyVaccine = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preSelectedVaccineId = searchParams.get('vaccine');

  const [vaccines, setVaccines] = useState([]);
  const [pens, setPens] = useState([]);
  const [animals, setAnimals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);

  const [selectedVaccine, setSelectedVaccine] = useState(null);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    vaccineRecipeId: preSelectedVaccineId || '',
    scope: 'Pen',
    penId: '',
    animalId: '',
    selectedAnimals: [],
    nextDueDate: '',
    remarks: ''
  });

  const [errors, setErrors] = useState({});

  const getId = (item) => item?._id ?? item?.id;

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (formData.scope === 'Pen' && formData.penId) {
      fetchPenAnimals(formData.penId);
    } else if (formData.scope !== 'Pen') {
      fetchAllAnimals();
    }
  }, [formData.scope, formData.penId]);

  useEffect(() => {
    if (formData.vaccineRecipeId) {
      const vaccine = vaccines.find(v => getId(v) === formData.vaccineRecipeId);
      setSelectedVaccine(vaccine || null);
    } else {
      setSelectedVaccine(null);
    }
  }, [formData.vaccineRecipeId, vaccines]);

  const fetchData = async () => {
    try {
      const [vaccinesRes, pensRes] = await Promise.all([
        vaccinationAPI.getAllVaccines(),
        penAPI.getAll({ limit: 100 })
      ]);
      
      if (vaccinesRes.success) setVaccines(vaccinesRes.data);
      if (pensRes.success) setPens(pensRes.data);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  // Pen-wide and All-Animals scopes need EVERY animal in scope, not a
  // paginated slice. Default backend limit is 10 — pass a large limit so the
  // dropdown / count reflects reality. Backend caps at 5000.
  const ANIMAL_FETCH_LIMIT = 5000;

  const fetchPenAnimals = async (penId) => {
    try {
      const response = await animalAPI.getAll({
        pen: penId,
        status: 'Active',
        limit: ANIMAL_FETCH_LIMIT
      });
      if (response.success) setAnimals(response.data);
    } catch (error) {
      if (typeof console !== 'undefined' && console.error) {
        console.error('Failed to fetch pen animals', error);
      }
    }
  };

  const fetchAllAnimals = async () => {
    try {
      const response = await animalAPI.getAll({
        status: 'Active',
        limit: ANIMAL_FETCH_LIMIT
      });
      if (response.success) setAnimals(response.data);
    } catch (error) {
      if (typeof console !== 'undefined' && console.error) {
        console.error('Failed to fetch animals', error);
      }
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleAnimalSelection = (animalId) => {
    setFormData(prev => {
      const isSelected = prev.selectedAnimals.includes(animalId);
      return {
        ...prev,
        selectedAnimals: isSelected
          ? prev.selectedAnimals.filter(id => id !== animalId)
          : [...prev.selectedAnimals, animalId]
      };
    });
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.vaccineRecipeId) newErrors.vaccineRecipeId = 'Please select a vaccine';
    if (formData.scope === 'Pen' && !formData.penId) newErrors.penId = 'Please select a pen';
    if (formData.scope === 'Individual' && !formData.animalId) newErrors.animalId = 'Please select an animal';
    if (formData.scope === 'Multiple' && formData.selectedAnimals.length === 0) {
      newErrors.selectedAnimals = 'Please select at least one animal';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      toast.error('Please fix the errors');
      return;
    }

    setApplying(true);
    try {
      const applicationData = {
        date: formData.date,
        vaccineRecipeId: formData.vaccineRecipeId,
        scope: formData.scope,
        pen: formData.scope === 'Pen' ? formData.penId : undefined,
        animal: formData.scope === 'Individual' ? formData.animalId : undefined,
        animals: formData.scope === 'Multiple' ? formData.selectedAnimals : undefined,
        nextDueDate: formData.nextDueDate || undefined,
        remarks: formData.remarks || undefined
      };

      const response = await vaccinationAPI.applyVaccine(applicationData);
      
      if (response.success) {
        const animalCount = formData.scope === 'Pen' 
          ? animals.length 
          : formData.scope === 'Multiple' 
            ? formData.selectedAnimals.length 
            : 1;
        toast.success(`Vaccine applied successfully to ${animalCount} animal(s)`);
        
        // Reset form
        setFormData({
          date: new Date().toISOString().split('T')[0],
          vaccineRecipeId: '',
          scope: 'Pen',
          penId: '',
          animalId: '',
          selectedAnimals: [],
          nextDueDate: '',
          remarks: ''
        });
        setSelectedVaccine(null);
      }
    } catch (error) {
      toast.error(error.message || 'Failed to apply vaccine');
    } finally {
      setApplying(false);
    }
  };

  const selectedPen = pens.find(p => getId(p) === formData.penId);
  const animalCount = formData.scope === 'Pen' 
    ? animals.length 
    : formData.scope === 'Multiple' 
      ? formData.selectedAnimals.length 
      : 1;

  const totalCost = selectedVaccine ? (selectedVaccine.totalCost || 0) * animalCount : 0;

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Apply Vaccine"
        subtitle="Apply vaccine recipe to animals"
        breadcrumbs={[
          { label: 'Vaccination' },
          { label: 'Apply Vaccine' }
        ]}
        action={
          <Button
            variant="ghost"
            icon={HiOutlineArrowLeft}
            onClick={() => navigate('/dashboard/vaccination/vaccines')}
          >
            Back
          </Button>
        }
      />

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <h3 className="text-lg font-semibold text-gray-800 mb-6">Application Details</h3>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Date *"
                  name="date"
                  type="date"
                  value={formData.date}
                  onChange={handleChange}
                  error={errors.date}
                />

                <Select
                  label="Select Vaccine *"
                  name="vaccineRecipeId"
                  value={formData.vaccineRecipeId}
                  onChange={handleChange}
                  error={errors.vaccineRecipeId}
                  placeholder="Select a vaccine"
                >
                  {vaccines.map(vaccine => (
                    <option key={getId(vaccine)} value={getId(vaccine)}>
                      {vaccine.name} ({vaccine.disease})
                    </option>
                  ))}
                </Select>

                <Select
                  label="Scope *"
                  name="scope"
                  value={formData.scope}
                  onChange={handleChange}
                  placeholder="Select scope"
                >
                  <option value="Pen">Pen-wide</option>
                  <option value="Individual">Individual Animal</option>
                  <option value="Multiple">Multiple Animals</option>
                </Select>

                {formData.scope === 'Pen' && (
                  <Select
                    label="Select Pen *"
                    name="penId"
                    value={formData.penId}
                    onChange={handleChange}
                    error={errors.penId}
                    placeholder="Select a pen"
                  >
                    {pens.map(pen => (
                      <option key={getId(pen)} value={getId(pen)}>
                        {pen.name} ({pen.animalCount || 0} animals)
                      </option>
                    ))}
                  </Select>
                )}

                {formData.scope === 'Individual' && (
                  <Select
                    label="Select Animal *"
                    name="animalId"
                    value={formData.animalId}
                    onChange={handleChange}
                    error={errors.animalId}
                    placeholder="Select an animal"
                  >
                    {animals.map(animal => (
                      <option key={getId(animal)} value={getId(animal)}>
                        {animal.tagId}
                      </option>
                    ))}
                  </Select>
                )}

                <Input
                  label="Next Due Date"
                  name="nextDueDate"
                  type="date"
                  value={formData.nextDueDate}
                  onChange={handleChange}
                />
              </div>

              {formData.scope === 'Multiple' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Animals * {errors.selectedAnimals && <span className="text-red-500 text-xs ml-2">{errors.selectedAnimals}</span>}
                  </label>
                  <div className="max-h-64 overflow-y-auto border rounded-lg p-4 space-y-2">
                    {animals.length === 0 ? (
                      <p className="text-gray-500 text-sm">No animals available</p>
                    ) : (
                      animals.map(animal => (
                        <label
                          key={getId(animal)}
                          className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={formData.selectedAnimals.includes(getId(animal))}
                            onChange={() => handleAnimalSelection(getId(animal))}
                            className="mr-3"
                          />
                              <span className="font-medium">{animal.tagId}</span>
                        </label>
                      ))
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    {formData.selectedAnimals.length} animal(s) selected
                  </p>
                </div>
              )}

              {selectedVaccine && (
                <div className="p-4 bg-purple-50 rounded-lg">
                  <h4 className="font-semibold text-purple-900 mb-3">Vaccine Details</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-purple-700">Disease</p>
                      <p className="font-medium text-purple-900">{selectedVaccine.disease}</p>
                    </div>
                    <div>
                      <p className="text-purple-700">Total Quantity per Animal</p>
                      <p className="font-medium text-purple-900">{selectedVaccine.totalQuantity} ml</p>
                    </div>
                    <div>
                      <p className="text-purple-700">Medicines</p>
                      <p className="font-medium text-purple-900">{selectedVaccine.medicines?.length || 0} items</p>
                    </div>
                    <div>
                      <p className="text-purple-700">Cost per Animal</p>
                      <p className="font-medium text-purple-900">{formatCurrency(selectedVaccine.totalCost || 0)}</p>
                    </div>
                  </div>
                  {selectedVaccine.dosageInstructions && (
                    <div className="mt-3">
                      <p className="text-purple-700 text-sm">Dosage Instructions</p>
                      <p className="text-purple-900 text-sm">{selectedVaccine.dosageInstructions}</p>
                    </div>
                  )}
                </div>
              )}

              <Textarea
                label="Remarks"
                name="remarks"
                value={formData.remarks}
                onChange={handleChange}
                placeholder="Any additional notes..."
                rows={3}
              />
            </div>
          </Card>

          <Card>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Summary</h3>
            <div className="space-y-4">
              {selectedVaccine && (
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                    <HiOutlineShieldCheck className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Vaccine</p>
                    <p className="font-medium">{selectedVaccine.name}</p>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Scope</p>
                  <Badge variant="info">{formData.scope}</Badge>
                </div>

                {formData.scope === 'Pen' && selectedPen && (
                  <div>
                    <p className="text-sm text-gray-500">Pen</p>
                    <p className="font-medium">{selectedPen.name}</p>
                    <p className="text-sm text-gray-600">{animals.length} animals</p>
                  </div>
                )}

                {formData.scope === 'Multiple' && (
                  <div>
                    <p className="text-sm text-gray-500">Selected Animals</p>
                    <p className="font-medium">{formData.selectedAnimals.length} animals</p>
                  </div>
                )}

                <div>
                  <p className="text-sm text-gray-500">Total Animals</p>
                  <p className="text-2xl font-bold text-gray-900">{animalCount}</p>
                </div>

                {selectedVaccine && (
                  <div>
                    <p className="text-sm text-gray-500">Estimated Cost</p>
                    <p className="text-xl font-bold text-emerald-600">{formatCurrency(totalCost)}</p>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t">
                <Button
                  type="submit"
                  className="w-full"
                  loading={applying}
                  icon={HiOutlinePlay}
                >
                  Apply Vaccine
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </form>
    </div>
  );
};

export default ApplyVaccine;
