import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  HiOutlineArrowLeft,
  HiOutlinePlay,
  HiOutlineCheck,
  HiOutlineBeaker,
  HiOutlineCalendar
} from 'react-icons/hi';
import { GiSheep } from 'react-icons/gi';
import { feedAPI, penAPI } from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/helpers';
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

const ApplyRecipe = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preSelectedRecipeId = searchParams.get('recipe');

  const [recipes, setRecipes] = useState([]);
  const [pens, setPens] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);

  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [formData, setFormData] = useState({
    recipeId: preSelectedRecipeId || '',
    penIds: [],
    applyMode: 'single', // 'single' | 'range'
    date: new Date().toISOString().split('T')[0],
    dateStart: new Date().toISOString().split('T')[0],
    dateEnd: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const [errors, setErrors] = useState({});

  // Helper to get id from item (supports both _id and id)
  const getId = (item) => item?._id ?? item?.id;

  useEffect(() => {
    fetchData();
  }, []);

  // When a recipe is picked, default the selected pen to the recipe's default
  // shed (if any) — but only if the user hasn't picked anything yet. They can
  // still uncheck and pick multiple.
  useEffect(() => {
    if (formData.recipeId) {
      const recipe = recipes.find(r => String(getId(r)) === String(formData.recipeId));
      setSelectedRecipe(recipe || null);
      if (recipe && formData.penIds.length === 0) {
        const defaultPen = recipe.pen?._id || recipe.pen || recipe.penId;
        if (defaultPen) {
          setFormData(prev => ({ ...prev, penIds: [String(defaultPen)] }));
        }
      }
    } else {
      setSelectedRecipe(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.recipeId, recipes]);

  const fetchData = async () => {
    try {
      const [recipesRes, pensRes, applicationsRes] = await Promise.all([
        feedAPI.getAllRecipes(),
        penAPI.getAll({ limit: 100 }),
        feedAPI.getApplications()
      ]);

      if (recipesRes.success) setRecipes(recipesRes.data);
      if (pensRes.success) setPens(pensRes.data);
      if (applicationsRes.success) setApplications(applicationsRes.data);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

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
  };

  const clearPenSelection = () => {
    setFormData(prev => ({ ...prev, penIds: [] }));
  };

  // Compute total animals across the picked sheds and a list of selected-pen
  // objects (for the preview). Memoised so we don't recalc on every render.
  const { selectedPens, totalAnimals } = useMemo(() => {
    const picked = pens.filter(p => formData.penIds.includes(String(getId(p))));
    const total = picked.reduce((sum, p) => sum + (p.animalCount || 0), 0);
    return { selectedPens: picked, totalAnimals: total };
  }, [pens, formData.penIds]);

  const dayCount = useMemo(() => {
    if (formData.applyMode !== 'range') return 1;
    if (!formData.dateStart || !formData.dateEnd) return 1;
    const start = new Date(formData.dateStart);
    const end = new Date(formData.dateEnd);
    if (start > end) return 0;
    return Math.ceil((end - start) / (24 * 60 * 60 * 1000)) + 1;
  }, [formData.applyMode, formData.dateStart, formData.dateEnd]);

  const validate = () => {
    const newErrors = {};

    if (!formData.recipeId) {
      newErrors.recipeId = 'Please select a recipe';
    }
    if (formData.penIds.length === 0) {
      newErrors.penIds = 'Select at least one shed/pen';
    }
    if (formData.applyMode === 'single') {
      if (!formData.date) newErrors.date = 'Date is required';
    } else {
      if (!formData.dateStart) newErrors.dateStart = 'Start date is required';
      if (!formData.dateEnd) newErrors.dateEnd = 'End date is required';
      if (formData.dateStart && formData.dateEnd && formData.dateStart > formData.dateEnd) {
        newErrors.dateEnd = 'End date must be on or after start date';
      }
      if (dayCount > 90) {
        newErrors.dateEnd = 'Date range cannot exceed 90 days';
      }
    }

    // Stock availability: need ing.quantity × totalAnimals × dayCount across
    // ALL selected pens.
    if (selectedRecipe && totalAnimals > 0) {
      const insufficientStock = selectedRecipe.ingredients.filter(
        ing => (ing.quantity * totalAnimals * dayCount) > (ing.currentStock || 0)
      );
      if (insufficientStock.length > 0) {
        newErrors.stock =
          `Not enough stock for ${totalAnimals} animal(s)` +
          (dayCount > 1 ? ` × ${dayCount} days` : '') +
          `: ${insufficientStock.map(i => i.name).join(', ')}`;
      }
    }
    if (selectedRecipe && totalAnimals === 0 && formData.penIds.length > 0) {
      newErrors.penIds = 'Selected shed(s) have no active animals';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleApply = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const recipeIdKey = String(formData.recipeId).trim();
    const penIdsKey = formData.penIds.map(String);

    setApplying(true);
    try {
      let successApps = [];
      let failedDates = [];

      if (formData.applyMode === 'range') {
        const response = await feedAPI.applyRecipeRange({
          recipe: recipeIdKey,
          pens: penIdsKey,
          dateStart: formData.dateStart,
          dateEnd: formData.dateEnd,
          notes: formData.notes || null
        });
        if (response.success && response.data) {
          // Each day returns either a single application (legacy) or a
          // { applications, ... } envelope (multi-pen). Flatten to a flat list.
          successApps = (response.data.succeeded || []).flatMap(d => {
            if (Array.isArray(d?.applications)) return d.applications;
            return d ? [d] : [];
          });
          failedDates = response.data.failed || [];
        } else {
          throw new Error(response.message || 'Failed to apply recipe range');
        }
      } else {
        const response = await feedAPI.applyRecipe({
          recipe: recipeIdKey,
          pens: penIdsKey,
          date: formData.date,
          notes: formData.notes || null
        });
        if (response.success) {
          // Multi-pen response shape: { applications: [...] }
          if (Array.isArray(response.data?.applications)) {
            successApps = response.data.applications;
          } else if (response.data) {
            successApps = [response.data];
          }
        } else {
          throw new Error(response.message || 'Failed to apply recipe');
        }
      }

      if (successApps.length > 0) {
        if (dayCount > 1 || formData.penIds.length > 1) {
          await fetchData(); // refresh to get the full list ordered correctly
        } else {
          setApplications(prev => [...successApps, ...prev]);
        }

        const penLabel = penIdsKey.length === 1
          ? (selectedPens[0]?.name || 'shed')
          : `${penIdsKey.length} sheds`;

        const expectedCount = dayCount * penIdsKey.length;
        if (successApps.length === expectedCount) {
          toast.success(
            dayCount === 1
              ? `Recipe applied to ${penLabel} successfully`
              : `Recipe applied to ${penLabel} for ${dayCount} days successfully`
          );
        } else {
          toast.success(
            `Applied ${successApps.length} of ${expectedCount} records. ${failedDates.length} day(s) failed.`
          );
          failedDates.forEach(({ date, error }) => toast.error(`${date}: ${error}`));
        }

        // Reset form
        const today = new Date().toISOString().split('T')[0];
        setFormData(prev => ({
          ...prev,
          recipeId: '',
          penIds: [],
          date: today,
          dateStart: today,
          dateEnd: today,
          notes: ''
        }));
        setSelectedRecipe(null);
      } else {
        toast.error(failedDates[0]?.error || 'Failed to apply recipe');
      }
    } catch (error) {
      toast.error(error.message || 'Failed to apply recipe');
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return <PageLoader />;
  }

  // Per-animal cost from the recipe (semantic: recipe.totalCost IS per-animal).
  const costPerAnimal = Number(selectedRecipe?.totalCost) || 0;
  const totalCostForApply = costPerAnimal * totalAnimals * dayCount;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Apply Recipe to Shed(s)"
        subtitle="Charge feed cost to animals in one or more sheds"
        breadcrumbs={[
          { label: 'Feed Management' },
          { label: 'Apply Recipe' }
        ]}
        action={
          <Button
            variant="ghost"
            icon={HiOutlineArrowLeft}
            onClick={() => navigate('/dashboard/feed/recipes')}
          >
            Back to Recipes
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Application Form */}
        <Card className="lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Apply Feed Recipe</h3>

          <form onSubmit={handleApply} className="space-y-6">
            <Select
              label="Select Recipe"
              name="recipeId"
              value={formData.recipeId}
              onChange={handleChange}
              options={recipes.map(r => ({
                value: getId(r),
                label: `${r.name} - ${formatCurrency(r.totalCost || 0)}/animal`
              }))}
              placeholder="Choose a recipe"
              error={errors.recipeId}
              required
            />

            {/* Multi-pen picker */}
            <div>
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
                  <strong>{totalAnimals} animal{totalAnimals === 1 ? '' : 's'} total</strong>
                </p>
              )}
              {errors.penIds && (
                <p className="mt-1 text-sm text-red-600">{errors.penIds}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Apply for</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="applyMode"
                    value="single"
                    checked={formData.applyMode === 'single'}
                    onChange={handleChange}
                    className="text-emerald-600 border-gray-300 focus:ring-emerald-500"
                  />
                  <span className="text-sm">Single Day</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="applyMode"
                    value="range"
                    checked={formData.applyMode === 'range'}
                    onChange={handleChange}
                    className="text-emerald-600 border-gray-300 focus:ring-emerald-500"
                  />
                  <span className="text-sm">Date Range</span>
                </label>
              </div>
            </div>

            {formData.applyMode === 'single' ? (
              <Input
                label="Application Date"
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                error={errors.date}
                required
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Start Date"
                  type="date"
                  name="dateStart"
                  value={formData.dateStart}
                  onChange={handleChange}
                  error={errors.dateStart}
                  required
                />
                <Input
                  label="End Date"
                  type="date"
                  name="dateEnd"
                  value={formData.dateEnd}
                  onChange={handleChange}
                  error={errors.dateEnd}
                  required
                />
                {dayCount > 0 && (
                  <p className="sm:col-span-2 text-sm text-gray-500">
                    Will apply recipe for <strong>{dayCount}</strong> day{dayCount === 1 ? '' : 's'}
                  </p>
                )}
              </div>
            )}

            <Textarea
              label="Notes (Optional)"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Any additional notes..."
              rows={2}
            />

            {errors.stock && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-sm text-red-600">{errors.stock}</p>
              </div>
            )}

            {/* Recipe Preview — stock consumption for the selected animals */}
            {selectedRecipe && totalAnimals > 0 && (
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                <h4 className="font-semibold text-amber-800 mb-1">
                  Recipe: {selectedRecipe.name}
                </h4>
                <p className="text-xs text-amber-700 mb-3">
                  Quantities below are the recipe per-animal value × {totalAnimals} animal{totalAnimals === 1 ? '' : 's'}
                  {dayCount > 1 ? ` × ${dayCount} days` : ''}
                </p>
                <div className="space-y-2">
                  {selectedRecipe.ingredients.map((ing, i) => {
                    const needQty = ing.quantity * totalAnimals * dayCount;
                    const lineCost = ing.total * totalAnimals * dayCount;
                    const hasStock = (ing.currentStock || 0) >= needQty;
                    return (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <HiOutlineBeaker className="w-4 h-4 text-amber-600" />
                          <span>{ing.name}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-gray-600">
                            {ing.quantity} × {totalAnimals}
                            {dayCount > 1 ? ` × ${dayCount}` : ''} = {needQty} {ing.unit}
                          </span>
                          <span className={`font-medium ${!hasStock ? 'text-red-600' : 'text-emerald-600'}`}>
                            {formatCurrency(lineCost)}
                          </span>
                          {!hasStock && (
                            <Badge variant="danger" className="text-xs">Low Stock</Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div className="pt-2 mt-2 border-t border-amber-200 flex justify-between">
                    <span className="font-semibold text-amber-800">Total cost:</span>
                    <span className="font-bold text-emerald-600">
                      {formatCurrency(totalCostForApply)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Cost Allocation Preview */}
            {selectedRecipe && totalAnimals > 0 && (
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                <h4 className="font-semibold text-emerald-800 mb-3">Cost Allocation Preview</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-emerald-600">Sheds selected</p>
                    <p className="text-xl font-bold text-emerald-800">{formData.penIds.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-emerald-600">Total animals</p>
                    <p className="text-xl font-bold text-emerald-800">{totalAnimals}</p>
                  </div>
                  <div>
                    <p className="text-sm text-emerald-600">Cost per animal{dayCount > 1 ? ' (per day)' : ''}</p>
                    <p className="text-xl font-bold text-emerald-800">{formatCurrency(costPerAnimal)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-emerald-600">
                      Total cost{dayCount > 1 ? ` (${dayCount} days)` : ''}
                    </p>
                    <p className="text-xl font-bold text-emerald-800">
                      {formatCurrency(totalCostForApply)}
                    </p>
                  </div>
                </div>

                {/* Per-shed breakdown when more than one shed picked */}
                {selectedPens.length > 1 && (
                  <div className="mt-4 pt-4 border-t border-emerald-200">
                    <p className="text-xs text-emerald-700 font-medium mb-2">Per-shed breakdown</p>
                    <div className="space-y-1">
                      {selectedPens.map(p => {
                        const count = p.animalCount || 0;
                        const cost = costPerAnimal * count * dayCount;
                        return (
                          <div key={getId(p)} className="flex justify-between text-sm">
                            <span className="text-gray-700">
                              {p.name} <span className="text-gray-500">({count} animals)</span>
                            </span>
                            <span className="font-medium text-emerald-700">
                              {formatCurrency(cost)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            <Button
              type="submit"
              fullWidth
              icon={HiOutlinePlay}
              loading={applying}
              disabled={!selectedRecipe || totalAnimals === 0}
            >
              {dayCount > 1
                ? `Apply Recipe to ${formData.penIds.length || 0} Shed${formData.penIds.length === 1 ? '' : 's'} for ${dayCount} Days`
                : `Apply Recipe to ${formData.penIds.length || 0} Shed${formData.penIds.length === 1 ? '' : 's'}`}
            </Button>
          </form>
        </Card>

        {/* Recent Applications */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Applications</h3>

          {applications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No applications yet
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {applications.slice(0, 10).map((app) => (
                <div
                  key={app.id || app._id}
                  className="p-3 bg-gray-50 rounded-xl border border-gray-200"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                        <HiOutlineCheck className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{app.recipeName}</p>
                        <p className="text-xs text-gray-500">{app.penName}</p>
                      </div>
                    </div>
                    <Badge variant="success" className="text-xs">Applied</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1 text-gray-500">
                      <HiOutlineCalendar className="w-4 h-4" />
                      <span>{formatDate(app.date)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <GiSheep className="w-4 h-4 text-emerald-600" />
                      <span className="text-gray-600">{app.animalCount}</span>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-gray-200 flex justify-between text-sm">
                    <span className="text-gray-500">Total Cost:</span>
                    <span className="font-semibold text-emerald-600">{formatCurrency(app.totalCost)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Applications History Table */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Application History</h3>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recipe</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shed</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Animals</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Cost</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost/Animal</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {applications.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No applications recorded yet
                  </td>
                </tr>
              ) : (
                applications.map((app) => (
                  <tr key={getId(app)}>
                    <td className="px-4 py-3 text-sm">{formatDate(app.date)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                          <HiOutlineBeaker className="w-4 h-4 text-amber-600" />
                        </div>
                        <span className="font-medium text-sm">{app.recipeName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="info">{app.penName}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm">{app.animalCount}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-emerald-600">
                      {formatCurrency(app.totalCost)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {formatCurrency(app.costPerAnimal)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {app.notes || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default ApplyRecipe;
