import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  HiOutlineArrowLeft,
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlineBeaker
} from 'react-icons/hi';
import { penAPI, stockAPI, feedAPI } from '../../services/api';
import { groupStocksByNameAndRate } from '../../utils/stockUtils';
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

const FeedRecipeForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [pens, setPens] = useState([]);
  const [feedItems, setFeedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    name: '',
    penId: '',
    description: '',
    ingredients: []
  });

  // Ingredient selection state
  const [selectedIngredient, setSelectedIngredient] = useState({
    stockId: '',
    quantity: ''
  });

  // Helper to get id from item (supports both _id and id)
  const getId = (item) => item?._id ?? item?.id;

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchData = async () => {
    try {
      const [pensRes, stocksRes] = await Promise.all([
        penAPI.getAll({ limit: 100 }),
        stockAPI.getAll()
      ]);
      
      if (pensRes.success) setPens(pensRes.data);
      if (stocksRes.success) {
        const feeds = stocksRes.data.filter(s => s.category === 'Feeding');
        setFeedItems(groupStocksByNameAndRate(feeds));
      }

      if (isEdit) {
        const recipeRes = await feedAPI.getRecipeById(id);
        if (recipeRes.success) {
          setFormData(recipeRes.data);
        }
      }
    } catch (error) {
      toast.error('Failed to fetch data');
      if (isEdit) navigate('/dashboard/feed/recipes');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleIngredientChange = (e) => {
    const { name, value } = e.target;
    setSelectedIngredient(prev => ({ ...prev, [name]: value }));
  };

  // Get selected ingredient's available stock
  const selectedStock = selectedIngredient.stockId 
    ? feedItems.find(f => String(getId(f)) === String(selectedIngredient.stockId)) 
    : null;
  const selectedStockAvailable = selectedStock?.currentQty ?? 0;

  const addIngredient = () => {
    if (!selectedIngredient.stockId || !selectedIngredient.quantity) {
      toast.error('Please select ingredient and enter quantity');
      return;
    }

    const stock = feedItems.find(f => String(getId(f)) === String(selectedIngredient.stockId));
    if (!stock) return;

    const stockIdKey = getId(stock);
    const qty = parseFloat(selectedIngredient.quantity);
    const availableQty = stock.currentQty ?? 0;

    if (qty <= 0) {
      toast.error('Quantity must be greater than 0');
      return;
    }

    // Check if quantity exceeds available stock
    if (qty > availableQty) {
      toast.error(`Insufficient stock! Only ${availableQty} ${stock.unit} available for ${stock.productName}`);
      return;
    }

    // Check if ingredient already added
    if (formData.ingredients.some(i => String(i.stockId || i.stock) === String(stockIdKey))) {
      toast.error('Ingredient already added');
      return;
    }

    const ingredient = {
      stockId: stockIdKey,
      name: stock.productName,
      unit: stock.unit,
      ratePerUnit: stock.openingRatePerUnit || 0,
      currentStock: availableQty,
      quantity: qty,
      total: qty * (stock.openingRatePerUnit || 0)
    };

    setFormData(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, ingredient]
    }));

    setSelectedIngredient({ stockId: '', quantity: '' });
  };

  const removeIngredient = (index) => {
    setFormData(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index)
    }));
  };

  const updateIngredientQuantity = (index, newQty) => {
    const qty = parseFloat(newQty) || 0;
    const ingredient = formData.ingredients[index];
    
    // Check if quantity exceeds available stock
    if (qty > ingredient.currentStock) {
      toast.error(`Insufficient stock! Only ${ingredient.currentStock} ${ingredient.unit} available for ${ingredient.name}`);
      return;
    }

    setFormData(prev => ({
      ...prev,
      ingredients: prev.ingredients.map((ing, i) => {
        if (i === index) {
          return {
            ...ing,
            quantity: qty,
            total: qty * ing.ratePerUnit
          };
        }
        return ing;
      })
    }));
  };

  // Check if an ingredient quantity exceeds its stock
  const isOverStock = (ingredient) => {
    return ingredient.quantity > ingredient.currentStock;
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Recipe name is required';
    }
    if (!formData.penId) {
      newErrors.penId = 'Please select a shed/pen';
    }
    if (formData.ingredients.length === 0) {
      newErrors.ingredients = 'Add at least one ingredient';
    }

    // Check if any ingredient exceeds available stock
    const overStockItems = formData.ingredients.filter(ing => ing.quantity > ing.currentStock);
    if (overStockItems.length > 0) {
      const itemNames = overStockItems.map(i => i.name).join(', ');
      newErrors.ingredients = `Quantity exceeds available stock for: ${itemNames}`;
      toast.error(`Some ingredients exceed available stock. Please reduce quantity for: ${itemNames}`);
    }

    // Check for zero quantities
    const zeroQtyItems = formData.ingredients.filter(ing => ing.quantity <= 0);
    if (zeroQtyItems.length > 0) {
      newErrors.ingredients = 'All ingredients must have quantity greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const penIdKey = String(formData.penId).trim();
      const pen = pens.find(p => String(getId(p)) === String(penIdKey));
      
      const recipeData = {
        name: formData.name,
        pen: penIdKey,
        penName: pen?.name,
        description: formData.description || null,
        ingredients: formData.ingredients.map(i => ({
          stock: i.stockId || i.stock,
          name: i.name,
          unit: i.unit,
          ratePerUnit: i.ratePerUnit,
          quantity: i.quantity,
          total: i.total
        }))
      };

      if (isEdit) {
        await feedAPI.updateRecipe(id, recipeData);
        toast.success('Recipe updated successfully');
      } else {
        await feedAPI.createRecipe(recipeData);
        toast.success('Recipe created successfully');
      }

      navigate('/dashboard/feed/recipes');
    } catch (error) {
      toast.error(error.message || 'Failed to save recipe');
    } finally {
      setSubmitting(false);
    }
  };

  const totalCost = formData.ingredients.reduce((sum, i) => sum + i.total, 0);
  const totalQuantity = formData.ingredients.reduce((sum, i) => sum + i.quantity, 0);

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={isEdit ? 'Edit Feed Recipe' : 'Create Feed Recipe'}
        subtitle={isEdit ? 'Modify the feed recipe' : 'Create a new feed recipe for a shed'}
        breadcrumbs={[
          { label: 'Feed Management' },
          { label: 'Recipes', path: '/dashboard/feed/recipes' },
          { label: isEdit ? 'Edit' : 'Create' }
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

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <Card className="lg:col-span-2">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Recipe Details</h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Recipe Name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g., Morning Feed Mix"
                  error={errors.name}
                  required
                />
                <Select
                  label="Select Shed/Pen"
                  name="penId"
                  value={formData.penId}
                  onChange={handleChange}
                  options={pens.map(p => ({
                    value: getId(p),
                    label: `${p.name} (${p.animalCount ?? 0} animals)`
                  }))}
                  placeholder="Choose a shed"
                  error={errors.penId}
                  required
                />
              </div>

              <Textarea
                label="Description (Optional)"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Brief description of the recipe..."
                rows={2}
              />
            </div>

            {/* Add Ingredients */}
            <div className="mt-6">
              <label className="text-sm font-medium text-gray-700 mb-3 block">
                Add Ingredients
              </label>
              <div className="flex gap-3">
                <div className="flex-1">
                  <Select
                    name="stockId"
                    value={selectedIngredient.stockId}
                    onChange={handleIngredientChange}
                    options={feedItems.map(f => ({
                      value: getId(f),
                      label: `${f.productName} (Stock: ${f.currentQty ?? 0} ${f.unit}) - ${formatCurrency(f.openingRatePerUnit || 0)}/${f.unit}`
                    }))}
                    placeholder="Select ingredient"
                  />
                </div>
                <div className="w-32">
                  <Input
                    type="number"
                    name="quantity"
                    value={selectedIngredient.quantity}
                    onChange={handleIngredientChange}
                    placeholder="Qty"
                    max={selectedStockAvailable}
                  />
                </div>
                <Button type="button" onClick={addIngredient} icon={HiOutlinePlus}>
                  Add
                </Button>
              </div>
              {/* Show available stock info when ingredient is selected */}
              {selectedStock && (
                <div className={`mt-2 text-sm ${
                  parseFloat(selectedIngredient.quantity) > selectedStockAvailable 
                    ? 'text-red-600' 
                    : 'text-gray-500'
                }`}>
                  {parseFloat(selectedIngredient.quantity) > selectedStockAvailable ? (
                    <span className="flex items-center gap-1">
                      <span className="font-medium">⚠️ Exceeds stock!</span> Only {selectedStockAvailable} {selectedStock.unit} available for {selectedStock.productName}
                    </span>
                  ) : (
                    <span>Available: {selectedStockAvailable} {selectedStock.unit} of {selectedStock.productName}</span>
                  )}
                </div>
              )}
              {errors.ingredients && (
                <p className="mt-1 text-sm text-red-600">{errors.ingredients}</p>
              )}
            </div>

            {/* Ingredients Table */}
            {formData.ingredients.length > 0 && (
              <div className="mt-6 border border-gray-200 rounded-xl overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ingredient</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Available Stock</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rate/Unit</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {formData.ingredients.map((ing, index) => {
                      const exceedsStock = isOverStock(ing);
                      return (
                        <tr key={index} className={exceedsStock ? 'bg-red-50' : ''}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                exceedsStock ? 'bg-red-100' : 'bg-amber-100'
                              }`}>
                                <HiOutlineBeaker className={`w-4 h-4 ${
                                  exceedsStock ? 'text-red-600' : 'text-amber-600'
                                }`} />
                              </div>
                              <div>
                                <span className="font-medium text-sm">{ing.name}</span>
                                {exceedsStock && (
                                  <p className="text-xs text-red-600">Exceeds available stock!</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className={`px-4 py-3 text-sm ${exceedsStock ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                            {ing.currentStock} {ing.unit}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {formatCurrency(ing.ratePerUnit)}/{ing.unit}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                value={ing.quantity}
                                onChange={(e) => updateIngredientQuantity(index, e.target.value)}
                                className={`w-24 ${exceedsStock ? 'border-red-500 bg-red-50' : ''}`}
                                max={ing.currentStock}
                              />
                              <span className="text-sm text-gray-500">{ing.unit}</span>
                            </div>
                            {exceedsStock && (
                              <p className="text-xs text-red-600 mt-1">Max: {ing.currentStock}</p>
                            )}
                          </td>
                          <td className={`px-4 py-3 text-sm font-medium ${exceedsStock ? 'text-red-600' : 'text-emerald-600'}`}>
                            {formatCurrency(ing.total)}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => removeIngredient(index)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <HiOutlineTrash className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Summary Card */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Recipe Summary</h3>
            
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-500">Total Ingredients</p>
                <p className="text-2xl font-bold text-gray-800">{formData.ingredients.length}</p>
              </div>
              
              <div className="p-4 bg-amber-50 rounded-xl">
                <p className="text-sm text-amber-600">Total Quantity</p>
                <p className="text-2xl font-bold text-amber-700">{totalQuantity.toFixed(2)} units</p>
              </div>
              
              <div className="p-4 bg-emerald-50 rounded-xl">
                <p className="text-sm text-emerald-600">Total Cost</p>
                <p className="text-2xl font-bold text-emerald-700">{formatCurrency(totalCost)}</p>
              </div>

              {formData.penId && (
                <div className="p-4 bg-blue-50 rounded-xl">
                  <p className="text-sm text-blue-600">Cost per Animal</p>
                  <p className="text-2xl font-bold text-blue-700">
                    {formatCurrency(
                      totalCost / (pens.find(p => String(getId(p)) === String(formData.penId))?.animalCount || 1)
                    )}
                  </p>
                  <p className="text-xs text-blue-500 mt-1">
                    Based on {pens.find(p => String(getId(p)) === String(formData.penId))?.animalCount || 0} animals
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 pt-6 border-t space-y-3">
              <Button
                type="submit"
                fullWidth
                loading={submitting}
              >
                {isEdit ? 'Update Recipe' : 'Create Recipe'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                fullWidth
                onClick={() => navigate('/dashboard/feed/recipes')}
              >
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      </form>
    </div>
  );
};

export default FeedRecipeForm;
