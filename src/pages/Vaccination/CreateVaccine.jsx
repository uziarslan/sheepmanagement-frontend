import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  HiOutlineArrowLeft,
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlineShieldCheck
} from 'react-icons/hi';
import { stockAPI, vaccinationAPI } from '../../services/mockApi';
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

const CreateVaccine = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    name: '',
    disease: '',
    description: '',
    dosageInstructions: '',
    nextDoseDays: '',
    medicines: []
  });

  const [selectedMedicine, setSelectedMedicine] = useState({
    medicineId: '',
    quantity: ''
  });

  const getId = (item) => item?._id ?? item?.id;

  const fetchData = useCallback(async () => {
    try {
      const stocksRes = await stockAPI.getAll();
      
      if (stocksRes.success) {
        setMedications(stocksRes.data.filter(s => s.category === 'Medication'));
      }

      if (isEdit) {
        const vaccineRes = await vaccinationAPI.getVaccineById(id);
        if (vaccineRes.success) {
          setFormData(vaccineRes.data);
        }
      }
    } catch (error) {
      toast.error('Failed to fetch data');
      if (isEdit) navigate('/dashboard/vaccination/vaccines');
    } finally {
      setLoading(false);
    }
  }, [id, isEdit, navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleMedicineChange = (e) => {
    const { name, value } = e.target;
    setSelectedMedicine(prev => ({ ...prev, [name]: value }));
  };


  const selectedStock = selectedMedicine.medicineId 
    ? medications.find(m => getId(m) === selectedMedicine.medicineId) 
    : null;
  const selectedStockAvailable = selectedStock?.currentQty ?? 0;

  const addMedicine = () => {
    if (!selectedMedicine.medicineId || !selectedMedicine.quantity) {
      toast.error('Please select medicine and enter quantity');
      return;
    }

    const medicine = medications.find(m => getId(m) === selectedMedicine.medicineId);
    if (!medicine) return;

    const medicineIdKey = getId(medicine);
    const qty = parseFloat(selectedMedicine.quantity);
    const availableQty = medicine.currentQty ?? 0;

    if (qty <= 0) {
      toast.error('Quantity must be greater than 0');
      return;
    }

    if (formData.medicines.some(m => (m.medicine || m.medicineId) === medicineIdKey)) {
      toast.error('Medicine already added');
      return;
    }

    const medicineItem = {
      medicine: medicineIdKey,
      name: medicine.productName,
      unit: medicine.unit,
      ratePerUnit: medicine.openingRatePerUnit || medicine.costPerUnit || 0,
      currentStock: availableQty,
      quantity: qty,
      total: qty * (medicine.openingRatePerUnit || medicine.costPerUnit || 0)
    };

    setFormData(prev => ({
      ...prev,
      medicines: [...prev.medicines, medicineItem]
    }));

    setSelectedMedicine({ medicineId: '', quantity: '' });
  };

  const removeMedicine = (index) => {
    setFormData(prev => ({
      ...prev,
      medicines: prev.medicines.filter((_, i) => i !== index)
    }));
  };

  const updateMedicineQuantity = (index, newQty) => {
    const qty = parseFloat(newQty) || 0;

    if (qty <= 0) {
      toast.error('Quantity must be greater than 0');
      return;
    }

    setFormData(prev => ({
      ...prev,
      medicines: prev.medicines.map((med, i) => {
        if (i === index) {
          return {
            ...med,
            quantity: qty,
            total: qty * med.ratePerUnit
          };
        }
        return med;
      })
    }));
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Vaccine name is required';
    }
    if (!formData.disease.trim()) {
      newErrors.disease = 'Disease is required';
    }
    if (formData.medicines.length === 0) {
      newErrors.medicines = 'Add at least one medicine';
    }

    const zeroQtyItems = formData.medicines.filter(m => m.quantity <= 0);
    if (zeroQtyItems.length > 0) {
      newErrors.medicines = 'All medicines must have quantity greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const vaccineData = {
        name: formData.name,
        disease: formData.disease,
        description: formData.description || null,
        dosageInstructions: formData.dosageInstructions || null,
        nextDoseDays: formData.nextDoseDays ? parseInt(formData.nextDoseDays) : null,
        medicines: formData.medicines.map(m => ({
          medicine: m.medicine,
          quantity: m.quantity
        }))
      };

      let response;
      if (isEdit) {
        response = await vaccinationAPI.updateVaccine(id, vaccineData);
        toast.success('Vaccine recipe updated successfully');
      } else {
        response = await vaccinationAPI.createVaccine(vaccineData);
        toast.success('Vaccine recipe created successfully');
      }

      if (response.success) {
        navigate('/dashboard/vaccination/vaccines');
      }
    } catch (error) {
      toast.error(error.message || 'Failed to save vaccine recipe');
    } finally {
      setSubmitting(false);
    }
  };

  const totalQuantity = formData.medicines.reduce((sum, m) => sum + (m.quantity || 0), 0);
  const totalCost = formData.medicines.reduce((sum, m) => sum + (m.total || 0), 0);

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={isEdit ? 'Edit Vaccine Recipe' : 'Create Vaccine Recipe'}
        subtitle="Create a vaccine formula using medications from stock"
        breadcrumbs={[
          { label: 'Vaccination', path: '/dashboard/vaccination/vaccines' },
          { label: 'All Vaccines', path: '/dashboard/vaccination/vaccines' },
          { label: isEdit ? 'Edit' : 'Create' }
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
            <h3 className="text-lg font-semibold text-gray-800 mb-6">Vaccine Information</h3>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Vaccine Name *"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  error={errors.name}
                  placeholder="e.g., FMD Vaccine Formula"
                />

                <Input
                  label="Disease *"
                  name="disease"
                  value={formData.disease}
                  onChange={handleChange}
                  error={errors.disease}
                  placeholder="e.g., Foot and Mouth Disease"
                />
              </div>

              <Textarea
                label="Description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Brief description of the vaccine..."
                rows={2}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Textarea
                  label="Dosage Instructions"
                  name="dosageInstructions"
                  value={formData.dosageInstructions}
                  onChange={handleChange}
                  placeholder="How to administer this vaccine..."
                  rows={3}
                />

                <Input
                  label="Next Dose (Days)"
                  name="nextDoseDays"
                  type="number"
                  min="0"
                  value={formData.nextDoseDays}
                  onChange={handleChange}
                  placeholder="Days until next dose"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Medicines * {errors.medicines && <span className="text-red-500 text-xs ml-2">{errors.medicines}</span>}
                </label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Select
                      name="medicineId"
                      value={selectedMedicine.medicineId}
                      onChange={handleMedicineChange}
                      placeholder="Select medicine"
                    >
                      {medications.map(med => (
                        <option key={getId(med)} value={getId(med)}>
                          {med.productName} (Stock: {med.currentQty} {med.unit})
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="w-32">
                    <Input
                      name="quantity"
                      type="number"
                      step="0.1"
                      placeholder="Qty"
                      value={selectedMedicine.quantity}
                      onChange={handleMedicineChange}
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={addMedicine}
                    icon={HiOutlinePlus}
                  >
                    Add
                  </Button>
                </div>
                {selectedStock && (
                  <p className="text-xs text-gray-500 mt-1">
                    Available: {selectedStockAvailable} {selectedStock.unit} @ {formatCurrency(selectedStock.costPerUnit || selectedStock.openingRatePerUnit || 0)}/{selectedStock.unit}
                  </p>
                )}
              </div>

              {formData.medicines.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Medicine</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {formData.medicines.map((med, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900">{med.name}</p>
                            <p className="text-xs text-gray-500">Available: {med.currentStock} {med.unit}</p>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              step="0.1"
                              value={med.quantity}
                              onChange={(e) => updateMedicineQuantity(idx, e.target.value)}
                              className="w-20 px-2 py-1 border rounded"
                            />
                            <span className="text-xs text-gray-500 ml-1">{med.unit}</span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {formatCurrency(med.ratePerUnit)}/{med.unit}
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-emerald-600">
                            {formatCurrency(med.total)}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => removeMedicine(idx)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                              title="Remove"
                            >
                              <HiOutlineTrash className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Card>

          <Card>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Summary</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                  <HiOutlineShieldCheck className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Vaccine Recipe</p>
                  <p className="font-medium">{formData.name || 'Unnamed'}</p>
                </div>
              </div>

              <div className="pt-4 border-t space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Medicines</p>
                  <p className="text-2xl font-bold text-gray-900">{formData.medicines.length}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Total Quantity</p>
                  <p className="text-lg font-semibold text-gray-900">{totalQuantity.toFixed(2)} ml</p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Total Cost</p>
                  <p className="text-xl font-bold text-emerald-600">{formatCurrency(totalCost)}</p>
                </div>
              </div>

              <div className="pt-4 border-t space-y-2">
                <Button
                  type="submit"
                  className="w-full"
                  loading={submitting}
                >
                  {isEdit ? 'Update' : 'Create'} Vaccine
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  onClick={() => navigate('/dashboard/vaccination/vaccines')}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </form>
    </div>
  );
};

export default CreateVaccine;
