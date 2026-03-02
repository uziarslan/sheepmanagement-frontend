import React, { useState, useEffect } from 'react';
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
import { feedAPI, penAPI } from '../../services/mockApi';
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
    penId: '',
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

  useEffect(() => {
    if (formData.recipeId) {
      const recipe = recipes.find(r => String(getId(r)) === String(formData.recipeId));
      setSelectedRecipe(recipe || null);
      if (recipe && !formData.penId) {
        const recipePen = recipe.pen?._id || recipe.pen || recipe.penId;
        setFormData(prev => ({ ...prev, penId: recipePen?.toString() || '' }));
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

  const validate = () => {
    const newErrors = {};

    if (!formData.recipeId) {
      newErrors.recipeId = 'Please select a recipe';
    }
    if (!formData.penId) {
      newErrors.penId = 'Please select a shed/pen';
    }
    if (formData.applyMode === 'single') {
      if (!formData.date) newErrors.date = 'Date is required';
    } else {
      if (!formData.dateStart) newErrors.dateStart = 'Start date is required';
      if (!formData.dateEnd) newErrors.dateEnd = 'End date is required';
      if (formData.dateStart && formData.dateEnd && formData.dateStart > formData.dateEnd) {
        newErrors.dateEnd = 'End date must be on or after start date';
      }
      if (formData.dateStart && formData.dateEnd) {
        const start = new Date(formData.dateStart);
        const end = new Date(formData.dateEnd);
        const days = Math.ceil((end - start) / (24 * 60 * 60 * 1000)) + 1;
        if (days > 90) {
          newErrors.dateEnd = 'Date range cannot exceed 90 days';
        }
      }
    }

    // Check stock availability (for range, need stock × number of days)
    if (selectedRecipe) {
      let multiplier = 1;
      if (formData.applyMode === 'range' && formData.dateStart && formData.dateEnd) {
        const start = new Date(formData.dateStart);
        const end = new Date(formData.dateEnd);
        multiplier = Math.ceil((end - start) / (24 * 60 * 60 * 1000)) + 1;
      }
      const insufficientStock = selectedRecipe.ingredients.filter(
        ing => (ing.quantity * multiplier) > (ing.currentStock || 0)
      );
      if (insufficientStock.length > 0) {
        const msg = multiplier > 1
          ? `Insufficient stock for ${multiplier} days: ${insufficientStock.map(i => i.name).join(', ')}`
          : `Insufficient stock for: ${insufficientStock.map(i => i.name).join(', ')}`;
        newErrors.stock = msg;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getDatesToApply = () => {
    if (formData.applyMode === 'single') {
      return [formData.date];
    }
    const dates = [];
    const start = new Date(formData.dateStart);
    const end = new Date(formData.dateEnd);
    const current = new Date(start);
    while (current <= end) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  const handleApply = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const datesToApply = getDatesToApply();
    const recipeIdKey = String(formData.recipeId).trim();
    const penIdKey = String(formData.penId).trim();
    const pen = pens.find(p => String(getId(p)) === String(penIdKey));

    setApplying(true);
    try {
      const successApps = [];
      const failedDates = [];

      for (const date of datesToApply) {
        try {
          const applicationData = {
            recipe: recipeIdKey,
            pen: penIdKey,
            date,
            notes: formData.notes || null
          };
          const response = await feedAPI.applyRecipe(applicationData);
          if (response.success) {
            successApps.push(response.data);
          } else {
            failedDates.push({ date, error: response.message || 'Unknown error' });
          }
        } catch (err) {
          failedDates.push({ date, error: err.message || 'Failed' });
        }
      }

      if (successApps.length > 0) {
        setApplications(prev => [...successApps, ...prev]);
        if (datesToApply.length > 1) {
          await fetchData(); // Refresh to get full list with proper ordering
        }
        const penName = pen?.name || 'shed';
        if (successApps.length === datesToApply.length) {
          toast.success(
            datesToApply.length === 1
              ? `Recipe applied to ${penName} successfully`
              : `Recipe applied to ${penName} for ${successApps.length} days successfully`
          );
        } else {
          toast.success(
            `Recipe applied for ${successApps.length} of ${datesToApply.length} days. ${failedDates.length} failed.`
          );
          failedDates.forEach(({ date, error }) => toast.error(`${date}: ${error}`));
        }

        // Reset form
        const today = new Date().toISOString().split('T')[0];
        setFormData(prev => ({
          ...prev,
          recipeId: '',
          penId: '',
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

  const selectedPen = pens.find(p => String(getId(p)) === String(formData.penId));

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Apply Recipe to Shed"
        subtitle="Allocate feed cost to animals in a shed"
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Select Recipe"
                name="recipeId"
                value={formData.recipeId}
                onChange={handleChange}
                options={recipes.map(r => ({
                  value: getId(r),
                  label: `${r.name} - ${formatCurrency(r.totalCost || 0)}`
                }))}
                placeholder="Choose a recipe"
                error={errors.recipeId}
                required
              />
              <Select
                label="Target Shed/Pen"
                name="penId"
                value={formData.penId}
                onChange={handleChange}
                options={pens.map(p => ({
                  value: getId(p),
                  label: `${p.name} (${p.animalCount} animals)`
                }))}
                placeholder="Choose a shed"
                error={errors.penId}
                required
              />
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
                {formData.dateStart && formData.dateEnd && formData.dateStart <= formData.dateEnd && (
                  <p className="sm:col-span-2 text-sm text-gray-500">
                    Will apply recipe for{' '}
                    <strong>
                      {Math.ceil((new Date(formData.dateEnd) - new Date(formData.dateStart)) / (24 * 60 * 60 * 1000)) + 1}
                    </strong>{' '}
                    days
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

            {/* Recipe Preview */}
            {selectedRecipe && (() => {
              const dayCount = formData.applyMode === 'range' && formData.dateStart && formData.dateEnd && formData.dateStart <= formData.dateEnd
                ? Math.ceil((new Date(formData.dateEnd) - new Date(formData.dateStart)) / (24 * 60 * 60 * 1000)) + 1
                : 1;
              const multiplier = dayCount;
              return (
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                  <h4 className="font-semibold text-amber-800 mb-3">Recipe: {selectedRecipe.name}</h4>
                  <div className="space-y-2">
                    {selectedRecipe.ingredients.map((ing, i) => {
                      const needQty = ing.quantity * multiplier;
                      const hasStock = (ing.currentStock || 0) >= needQty;
                      return (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <HiOutlineBeaker className="w-4 h-4 text-amber-600" />
                            <span>{ing.name}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-gray-600">
                              {multiplier > 1 ? `${ing.quantity} × ${multiplier} = ${needQty}` : ing.quantity} {ing.unit}
                            </span>
                            <span className={`font-medium ${!hasStock ? 'text-red-600' : 'text-emerald-600'}`}>
                              {formatCurrency(ing.total * multiplier)}
                            </span>
                            {!hasStock && (
                              <Badge variant="danger" className="text-xs">Low Stock</Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <div className="pt-2 mt-2 border-t border-amber-200 flex justify-between">
                      <span className="font-semibold text-amber-800">
                        Total{multiplier > 1 ? ` (${multiplier} days)` : ''}:
                      </span>
                      <span className="font-bold text-emerald-600">
                        {formatCurrency(selectedRecipe.totalCost * multiplier)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Cost Allocation Preview */}
            {selectedRecipe && selectedPen && (() => {
              const dayCount = formData.applyMode === 'range' && formData.dateStart && formData.dateEnd && formData.dateStart <= formData.dateEnd
                ? Math.ceil((new Date(formData.dateEnd) - new Date(formData.dateStart)) / (24 * 60 * 60 * 1000)) + 1
                : 1;
              const totalCost = selectedRecipe.totalCost * dayCount;
              const costPerAnimalPerDay = selectedPen.animalCount > 0 ? selectedRecipe.totalCost / selectedPen.animalCount : 0;
              const costPerAnimalTotal = selectedPen.animalCount > 0 ? totalCost / selectedPen.animalCount : 0;
              return (
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                  <h4 className="font-semibold text-emerald-800 mb-3">Cost Allocation Preview</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-emerald-600">Animals in Shed</p>
                      <p className="text-xl font-bold text-emerald-800">{selectedPen.animalCount}</p>
                    </div>
                    <div>
                      <p className="text-sm text-emerald-600">Cost per Animal (per day)</p>
                      <p className="text-xl font-bold text-emerald-800">{formatCurrency(costPerAnimalPerDay)}</p>
                    </div>
                    {dayCount > 1 && (
                      <>
                        <div>
                          <p className="text-sm text-emerald-600">Days</p>
                          <p className="text-xl font-bold text-emerald-800">{dayCount}</p>
                        </div>
                        <div>
                          <p className="text-sm text-emerald-600">Total Cost ({dayCount} days)</p>
                          <p className="text-xl font-bold text-emerald-800">{formatCurrency(totalCost)}</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })()}

            <Button
              type="submit"
              fullWidth
              icon={HiOutlinePlay}
              loading={applying}
              disabled={!selectedRecipe || !selectedPen}
            >
              {formData.applyMode === 'range' && formData.dateStart && formData.dateEnd && formData.dateStart <= formData.dateEnd
                ? `Apply Recipe for ${Math.ceil((new Date(formData.dateEnd) - new Date(formData.dateStart)) / (24 * 60 * 60 * 1000)) + 1} Days`
                : 'Apply Recipe'}
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
                  key={app.id}
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
