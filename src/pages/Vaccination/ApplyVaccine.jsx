import React, { useState, useEffect, useMemo } from 'react';
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
  SearchableSelect,
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
    // Multi-shed: 'Pen' scope now accepts one or more pen IDs (mirrors
    // ApplyRecipe / Feeding). Submit fans out one request per pen.
    penIds: [],
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
    // For 'Pen' scope the backend expands pen → animals on its own. We rely
    // on each pen's animalCount for totals (same approach as Feeding's
    // ApplyRecipe). For Individual/Multiple scopes we still need the full
    // animal list for the dropdown / picker.
    if (formData.scope !== 'Pen') {
      fetchAllAnimals();
    }
  }, [formData.scope]);

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
        // Backend caps at 100; for >100 vaccines the searchable dropdown
        // will refetch server-side as the user types.
        vaccinationAPI.getAllVaccines({ limit: 100 }),
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

  // SearchableSelect calls onChange with the raw value (not an event).
  const setField = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  // Server-side search for the vaccine and animal dropdowns so they remain
  // usable when the underlying lists exceed the 100-record page size.
  const [vaccineSearchLoading, setVaccineSearchLoading] = useState(false);
  const searchVaccines = async (term) => {
    try {
      setVaccineSearchLoading(true);
      const params = { limit: 100 };
      if (term) params.search = term;
      const res = await vaccinationAPI.getAllVaccines(params);
      if (res.success) {
        setVaccines((prev) => {
          const byId = new Map();
          const sel = prev.find(v => getId(v) === formData.vaccineRecipeId);
          if (sel) byId.set(getId(sel), sel);
          res.data.forEach(v => byId.set(getId(v), v));
          return Array.from(byId.values());
        });
      }
    } catch (_) {
      // Silent — typeahead failures shouldn't surface as toasts.
    } finally {
      setVaccineSearchLoading(false);
    }
  };

  const [animalSearchLoading, setAnimalSearchLoading] = useState(false);
  const searchAnimals = async (term) => {
    try {
      setAnimalSearchLoading(true);
      const params = { status: 'Active', limit: ANIMAL_FETCH_LIMIT, sort: 'tagId' };
      if (term) params.search = term;
      const res = await animalAPI.getAll(params);
      if (res.success) {
        setAnimals((prev) => {
          const byId = new Map();
          const sel = prev.find(a => getId(a) === formData.animalId);
          if (sel) byId.set(getId(sel), sel);
          res.data.forEach(a => byId.set(getId(a), a));
          return Array.from(byId.values());
        });
      }
    } catch (_) {
      // Silent.
    } finally {
      setAnimalSearchLoading(false);
    }
  };

  // ---- Multi-pen helpers (mirror ApplyRecipe / Feeding) ----
  const togglePen = (penId) => {
    const key = String(penId);
    setFormData(prev => {
      const has = prev.penIds.includes(key);
      return {
        ...prev,
        penIds: has ? prev.penIds.filter(p => p !== key) : [...prev.penIds, key]
      };
    });
    if (errors.penIds) setErrors(prev => ({ ...prev, penIds: '' }));
  };

  const selectAllPens = () => {
    setFormData(prev => ({
      ...prev,
      penIds: pens.filter(p => (p.animalCount ?? 0) > 0).map(p => String(getId(p)))
    }));
    if (errors.penIds) setErrors(prev => ({ ...prev, penIds: '' }));
  };

  const clearPenSelection = () => {
    setFormData(prev => ({ ...prev, penIds: [] }));
  };

  // Total animals across the picked sheds — used for validation, the toast,
  // and the preview summary.
  const totalPenAnimals = useMemo(() => {
    const picked = pens.filter(p => formData.penIds.includes(String(getId(p))));
    return picked.reduce((sum, p) => sum + (p.animalCount || 0), 0);
  }, [pens, formData.penIds]);

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
    if (formData.scope === 'Pen' && formData.penIds.length === 0) {
      newErrors.penIds = 'Please select at least one shed';
    }
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
      const baseData = {
        date: formData.date,
        vaccineRecipeId: formData.vaccineRecipeId,
        nextDueDate: formData.nextDueDate || undefined,
        remarks: formData.remarks || undefined
      };

      if (formData.scope === 'Pen') {
        // Fan-out: one applyVaccine request per selected shed. The backend
        // currently accepts a single pen per call and keeps its per-pen
        // atomicity (stock deduction, animal cost distribution). Aggregating
        // multi-pen on the backend would be a bigger refactor — defer.
        const results = await Promise.allSettled(
          formData.penIds.map((penId) =>
            vaccinationAPI.applyVaccine({
              ...baseData,
              scope: 'Pen',
              pen: penId
            })
          )
        );

        const successes = [];
        const failures = [];
        results.forEach((r, idx) => {
          const penId = formData.penIds[idx];
          const pen = pens.find(p => String(getId(p)) === String(penId));
          const penName = pen?.name || `Pen ${idx + 1}`;
          if (r.status === 'fulfilled' && r.value?.success) {
            successes.push(penName);
          } else {
            const msg = r.status === 'rejected'
              ? (r.reason?.message || 'Request failed')
              : (r.value?.message || 'Request failed');
            failures.push(`${penName}: ${msg}`);
          }
        });

        if (successes.length > 0) {
          toast.success(
            `Vaccine applied to ${successes.length} shed${successes.length === 1 ? '' : 's'}` +
            ` (${totalPenAnimals} animal${totalPenAnimals === 1 ? '' : 's'} total)`
          );
        }
        failures.forEach((line) => toast.error(line));

        if (failures.length === 0) {
          // Only reset when everything succeeded — otherwise let the user
          // retry the remaining sheds.
          setFormData({
            date: new Date().toISOString().split('T')[0],
            vaccineRecipeId: '',
            scope: 'Pen',
            penIds: [],
            animalId: '',
            selectedAnimals: [],
            nextDueDate: '',
            remarks: ''
          });
          setSelectedVaccine(null);
        } else {
          // Drop the successful pens from the selection so a follow-up
          // submit only retries the failures.
          const successIds = new Set(
            successes
              .map(name => pens.find(p => p.name === name))
              .filter(Boolean)
              .map(p => String(getId(p)))
          );
          setFormData(prev => ({
            ...prev,
            penIds: prev.penIds.filter(id => !successIds.has(id))
          }));
        }
      } else {
        const applicationData = {
          ...baseData,
          scope: formData.scope,
          animal: formData.scope === 'Individual' ? formData.animalId : undefined,
          animals: formData.scope === 'Multiple' ? formData.selectedAnimals : undefined
        };

        const response = await vaccinationAPI.applyVaccine(applicationData);

        if (response.success) {
          const animalCount = formData.scope === 'Multiple'
            ? formData.selectedAnimals.length
            : 1;
          toast.success(`Vaccine applied successfully to ${animalCount} animal(s)`);

          setFormData({
            date: new Date().toISOString().split('T')[0],
            vaccineRecipeId: '',
            scope: 'Pen',
            penIds: [],
            animalId: '',
            selectedAnimals: [],
            nextDueDate: '',
            remarks: ''
          });
          setSelectedVaccine(null);
        }
      }
    } catch (error) {
      toast.error(error.message || 'Failed to apply vaccine');
    } finally {
      setApplying(false);
    }
  };

  const selectedPens = pens.filter(p => formData.penIds.includes(String(getId(p))));
  const animalCount = formData.scope === 'Pen'
    ? totalPenAnimals
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

                <SearchableSelect
                  label="Select Vaccine *"
                  value={formData.vaccineRecipeId}
                  onChange={(v) => setField('vaccineRecipeId', v)}
                  onSearch={searchVaccines}
                  loading={vaccineSearchLoading}
                  options={vaccines.map(vaccine => ({
                    value: getId(vaccine),
                    label: `${vaccine.name} (${vaccine.disease})`
                  }))}
                  placeholder="Select a vaccine"
                  searchPlaceholder="Search by name or disease..."
                  noOptionsText="No vaccines match your search"
                  error={errors.vaccineRecipeId}
                  required
                />

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
                  <div className="sm:col-span-2">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Target Sheds / Pens{' '}
                        <span className="text-xs text-gray-500 font-normal">
                          (select one or more)
                        </span>
                      </label>
                      <div className="flex items-center gap-3 text-xs">
                        <button
                          type="button"
                          onClick={selectAllPens}
                          className="text-emerald-600 hover:text-emerald-700 font-medium"
                        >
                          Select all
                        </button>
                        <span className="text-gray-300">|</span>
                        <button
                          type="button"
                          onClick={clearPenSelection}
                          className="text-gray-500 hover:text-gray-700 font-medium"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    <div className="border border-gray-200 rounded-xl divide-y divide-gray-100 max-h-60 overflow-y-auto">
                      {pens.length === 0 && (
                        <p className="px-4 py-6 text-sm text-gray-500 text-center">
                          No sheds available
                        </p>
                      )}
                      {pens.map((p) => {
                        const id = String(getId(p));
                        const checked = formData.penIds.includes(id);
                        const animalCount = p.animalCount ?? 0;
                        const empty = animalCount === 0;
                        return (
                          <label
                            key={id}
                            className={`flex items-center justify-between gap-3 px-4 py-3 cursor-pointer transition-colors ${
                              checked ? 'bg-emerald-50' : 'hover:bg-gray-50'
                            } ${empty ? 'opacity-60' : ''}`}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => togglePen(id)}
                                disabled={empty}
                                className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                              />
                              <div>
                                <p className="text-sm font-medium text-gray-800">{p.name}</p>
                                {empty && (
                                  <p className="text-xs text-gray-400">No active animals</p>
                                )}
                              </div>
                            </div>
                            <Badge variant={empty ? 'default' : 'info'} className="text-xs">
                              {animalCount} animal{animalCount === 1 ? '' : 's'}
                            </Badge>
                          </label>
                        );
                      })}
                    </div>

                    {formData.penIds.length > 0 && (
                      <p className="mt-2 text-sm text-gray-600">
                        Selected: <strong>{formData.penIds.length} shed{formData.penIds.length === 1 ? '' : 's'}</strong>
                        {' · '}
                        <strong>{totalPenAnimals} animal{totalPenAnimals === 1 ? '' : 's'} total</strong>
                      </p>
                    )}
                    {errors.penIds && (
                      <p className="mt-1 text-sm text-red-600">{errors.penIds}</p>
                    )}
                  </div>
                )}

                {formData.scope === 'Individual' && (
                  <SearchableSelect
                    label="Select Animal *"
                    value={formData.animalId}
                    onChange={(v) => setField('animalId', v)}
                    onSearch={searchAnimals}
                    loading={animalSearchLoading}
                    options={animals.map(animal => ({
                      value: getId(animal),
                      label: `${animal.tagId}${animal.name ? ` - ${animal.name}` : ''}`
                    }))}
                    placeholder="Select an animal"
                    searchPlaceholder="Search by tag ID or name..."
                    noOptionsText="No active animals match your search"
                    error={errors.animalId}
                    required
                  />
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

                {formData.scope === 'Pen' && selectedPens.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-500">
                      Shed{selectedPens.length === 1 ? '' : 's'}
                    </p>
                    <p className="font-medium">
                      {selectedPens.map(p => p.name).join(', ')}
                    </p>
                    <p className="text-sm text-gray-600">
                      {selectedPens.length} shed{selectedPens.length === 1 ? '' : 's'} ·{' '}
                      {totalPenAnimals} animal{totalPenAnimals === 1 ? '' : 's'}
                    </p>
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
