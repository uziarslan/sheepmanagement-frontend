// Mock API Service - Simulates backend API calls
// Replace these with actual API calls when backend is ready

import {
  mockAnimals,
  mockPens,
  mockStocks,
  mockEmployees,
  mockCapital,
  mockUser
} from '../data/mockData';

// Simulate API delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to generate unique IDs
const generateId = (items) => Math.max(...items.map(item => item.id), 0) + 1;

// Local storage keys
const STORAGE_KEYS = {
  ANIMALS: 'sheep_farm_animals',
  PENS: 'sheep_farm_pens',
  STOCKS: 'sheep_farm_stocks',
  EMPLOYEES: 'sheep_farm_employees',
  CAPITAL: 'sheep_farm_capital',
  USER: 'sheep_farm_user',
  ADVANCES: 'sheep_farm_advances',
  VACCINATIONS: 'sheep_farm_vaccinations',
  TREATMENTS: 'sheep_farm_treatments',
  DEWORMINGS: 'sheep_farm_dewormings',
  WEIGHT_RECORDS: 'sheep_farm_weight_records',
  BCS_RECORDS: 'sheep_farm_bcs_records',
  HOOF_RECORDS: 'sheep_farm_hoof_records',
  FEED_RECIPES: 'sheep_farm_feed_recipes',
  FEED_APPLICATIONS: 'sheep_farm_feed_applications'
};

// Mock advances data
const mockAdvances = [
  {
    id: 1,
    employeeId: 2,
    amount: 5000,
    type: 'Given',
    date: '2025-01-10',
    notes: 'Medical emergency'
  },
  {
    id: 2,
    employeeId: 3,
    amount: 10000,
    type: 'Given',
    date: '2025-01-05',
    notes: 'Personal loan'
  },
  {
    id: 3,
    employeeId: 5,
    amount: 3000,
    type: 'Given',
    date: '2025-01-15',
    notes: 'Advance salary'
  }
];

// Initialize local storage with mock data if empty
const initializeStorage = () => {
  if (!localStorage.getItem(STORAGE_KEYS.ANIMALS)) {
    localStorage.setItem(STORAGE_KEYS.ANIMALS, JSON.stringify(mockAnimals));
  }
  if (!localStorage.getItem(STORAGE_KEYS.PENS)) {
    localStorage.setItem(STORAGE_KEYS.PENS, JSON.stringify(mockPens));
  }
  if (!localStorage.getItem(STORAGE_KEYS.STOCKS)) {
    localStorage.setItem(STORAGE_KEYS.STOCKS, JSON.stringify(mockStocks));
  }
  if (!localStorage.getItem(STORAGE_KEYS.EMPLOYEES)) {
    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(mockEmployees));
  }
  if (!localStorage.getItem(STORAGE_KEYS.CAPITAL)) {
    localStorage.setItem(STORAGE_KEYS.CAPITAL, JSON.stringify(mockCapital));
  }
  if (!localStorage.getItem(STORAGE_KEYS.ADVANCES)) {
    localStorage.setItem(STORAGE_KEYS.ADVANCES, JSON.stringify(mockAdvances));
  }
  if (!localStorage.getItem(STORAGE_KEYS.VACCINATIONS)) {
    localStorage.setItem(STORAGE_KEYS.VACCINATIONS, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.TREATMENTS)) {
    localStorage.setItem(STORAGE_KEYS.TREATMENTS, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.DEWORMINGS)) {
    localStorage.setItem(STORAGE_KEYS.DEWORMINGS, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.WEIGHT_RECORDS)) {
    localStorage.setItem(STORAGE_KEYS.WEIGHT_RECORDS, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.BCS_RECORDS)) {
    localStorage.setItem(STORAGE_KEYS.BCS_RECORDS, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.HOOF_RECORDS)) {
    localStorage.setItem(STORAGE_KEYS.HOOF_RECORDS, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.FEED_RECIPES)) {
    localStorage.setItem(STORAGE_KEYS.FEED_RECIPES, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.FEED_APPLICATIONS)) {
    localStorage.setItem(STORAGE_KEYS.FEED_APPLICATIONS, JSON.stringify([]));
  }
};

// Initialize on load
initializeStorage();

// Generic CRUD operations
const getItems = (key) => JSON.parse(localStorage.getItem(key)) || [];
const setItems = (key, items) => localStorage.setItem(key, JSON.stringify(items));

// ============ ANIMAL API ============
export const animalAPI = {
  getAll: async () => {
    await delay(300);
    const animals = getItems(STORAGE_KEYS.ANIMALS);
    return { success: true, data: animals };
  },

  getById: async (id) => {
    await delay(200);
    const animals = getItems(STORAGE_KEYS.ANIMALS);
    const animal = animals.find(a => a.id === parseInt(id));
    if (animal) {
      return { success: true, data: animal };
    }
    throw new Error('Animal not found');
  },

  create: async (animalData) => {
    await delay(400);
    const animals = getItems(STORAGE_KEYS.ANIMALS);
    const newAnimal = {
      ...animalData,
      id: generateId(animals),
      createdAt: new Date().toISOString()
    };
    animals.push(newAnimal);
    setItems(STORAGE_KEYS.ANIMALS, animals);
    return { success: true, data: newAnimal, message: 'Animal added successfully' };
  },

  update: async (id, animalData) => {
    await delay(400);
    const animals = getItems(STORAGE_KEYS.ANIMALS);
    const index = animals.findIndex(a => a.id === parseInt(id));
    if (index === -1) throw new Error('Animal not found');
    
    animals[index] = { ...animals[index], ...animalData };
    setItems(STORAGE_KEYS.ANIMALS, animals);
    return { success: true, data: animals[index], message: 'Animal updated successfully' };
  },

  delete: async (id) => {
    await delay(300);
    const animals = getItems(STORAGE_KEYS.ANIMALS);
    const filtered = animals.filter(a => a.id !== parseInt(id));
    setItems(STORAGE_KEYS.ANIMALS, filtered);
    return { success: true, message: 'Animal deleted successfully' };
  }
};

// ============ PEN API ============
export const penAPI = {
  getAll: async () => {
    await delay(300);
    const pens = getItems(STORAGE_KEYS.PENS);
    const animals = getItems(STORAGE_KEYS.ANIMALS);
    
    // Calculate animal count for each pen
    const pensWithCount = pens.map(pen => ({
      ...pen,
      animalCount: animals.filter(a => a.penId === pen.id).length
    }));
    
    return { success: true, data: pensWithCount };
  },

  getById: async (id) => {
    await delay(200);
    const pens = getItems(STORAGE_KEYS.PENS);
    const pen = pens.find(p => p.id === parseInt(id));
    if (pen) {
      return { success: true, data: pen };
    }
    throw new Error('Pen not found');
  },

  create: async (penData) => {
    await delay(400);
    const pens = getItems(STORAGE_KEYS.PENS);
    const newPen = {
      ...penData,
      id: generateId(pens),
      animalCount: 0,
      createdAt: new Date().toISOString()
    };
    pens.push(newPen);
    setItems(STORAGE_KEYS.PENS, pens);
    return { success: true, data: newPen, message: 'Pen created successfully' };
  },

  update: async (id, penData) => {
    await delay(400);
    const pens = getItems(STORAGE_KEYS.PENS);
    const index = pens.findIndex(p => p.id === parseInt(id));
    if (index === -1) throw new Error('Pen not found');
    
    pens[index] = { ...pens[index], ...penData };
    setItems(STORAGE_KEYS.PENS, pens);
    return { success: true, data: pens[index], message: 'Pen updated successfully' };
  },

  delete: async (id) => {
    await delay(300);
    const pens = getItems(STORAGE_KEYS.PENS);
    const animals = getItems(STORAGE_KEYS.ANIMALS);
    
    // Check if pen has animals
    const hasAnimals = animals.some(a => a.penId === parseInt(id));
    if (hasAnimals) {
      throw new Error('Cannot delete pen with animals. Please move animals first.');
    }
    
    const filtered = pens.filter(p => p.id !== parseInt(id));
    setItems(STORAGE_KEYS.PENS, filtered);
    return { success: true, message: 'Pen deleted successfully' };
  }
};

// ============ STOCK API ============
export const stockAPI = {
  getAll: async () => {
    await delay(300);
    const stocks = getItems(STORAGE_KEYS.STOCKS);
    return { success: true, data: stocks };
  },

  getById: async (id) => {
    await delay(200);
    const stocks = getItems(STORAGE_KEYS.STOCKS);
    const stock = stocks.find(s => s.id === parseInt(id));
    if (stock) {
      return { success: true, data: stock };
    }
    throw new Error('Stock not found');
  },

  create: async (stockData) => {
    await delay(400);
    const stocks = getItems(STORAGE_KEYS.STOCKS);
    const newStock = {
      ...stockData,
      id: generateId(stocks),
      currentQty: stockData.openingStockQty,
      createdAt: new Date().toISOString()
    };
    stocks.push(newStock);
    setItems(STORAGE_KEYS.STOCKS, stocks);
    return { success: true, data: newStock, message: 'Stock item added successfully' };
  },

  update: async (id, stockData) => {
    await delay(400);
    const stocks = getItems(STORAGE_KEYS.STOCKS);
    const index = stocks.findIndex(s => s.id === parseInt(id));
    if (index === -1) throw new Error('Stock not found');
    
    stocks[index] = { ...stocks[index], ...stockData };
    setItems(STORAGE_KEYS.STOCKS, stocks);
    return { success: true, data: stocks[index], message: 'Stock updated successfully' };
  },

  delete: async (id) => {
    await delay(300);
    const stocks = getItems(STORAGE_KEYS.STOCKS);
    const filtered = stocks.filter(s => s.id !== parseInt(id));
    setItems(STORAGE_KEYS.STOCKS, filtered);
    return { success: true, message: 'Stock item deleted successfully' };
  }
};

// ============ EMPLOYEE API ============
export const employeeAPI = {
  getAll: async () => {
    await delay(300);
    const employees = getItems(STORAGE_KEYS.EMPLOYEES);
    return { success: true, data: employees };
  },

  getById: async (id) => {
    await delay(200);
    const employees = getItems(STORAGE_KEYS.EMPLOYEES);
    const employee = employees.find(e => e.id === parseInt(id));
    if (employee) {
      return { success: true, data: employee };
    }
    throw new Error('Employee not found');
  },

  create: async (employeeData) => {
    await delay(400);
    const employees = getItems(STORAGE_KEYS.EMPLOYEES);
    const newEmployee = {
      ...employeeData,
      id: generateId(employees),
      advanceBalance: 0,
      status: 'Active',
      createdAt: new Date().toISOString()
    };
    employees.push(newEmployee);
    setItems(STORAGE_KEYS.EMPLOYEES, employees);
    return { success: true, data: newEmployee, message: 'Employee added successfully' };
  },

  update: async (id, employeeData) => {
    await delay(400);
    const employees = getItems(STORAGE_KEYS.EMPLOYEES);
    const index = employees.findIndex(e => e.id === parseInt(id));
    if (index === -1) throw new Error('Employee not found');
    
    employees[index] = { ...employees[index], ...employeeData };
    setItems(STORAGE_KEYS.EMPLOYEES, employees);
    return { success: true, data: employees[index], message: 'Employee updated successfully' };
  },

  delete: async (id) => {
    await delay(300);
    const employees = getItems(STORAGE_KEYS.EMPLOYEES);
    const filtered = employees.filter(e => e.id !== parseInt(id));
    setItems(STORAGE_KEYS.EMPLOYEES, filtered);
    return { success: true, message: 'Employee deleted successfully' };
  }
};

// ============ ADVANCE API ============
export const advanceAPI = {
  getAll: async () => {
    await delay(300);
    const advances = getItems(STORAGE_KEYS.ADVANCES);
    // Sort by date descending
    advances.sort((a, b) => new Date(b.date) - new Date(a.date));
    return { success: true, data: advances };
  },

  getByEmployeeId: async (employeeId) => {
    await delay(200);
    const advances = getItems(STORAGE_KEYS.ADVANCES);
    const filtered = advances.filter(a => a.employeeId === parseInt(employeeId));
    return { success: true, data: filtered };
  },

  create: async (advanceData) => {
    await delay(400);
    const advances = getItems(STORAGE_KEYS.ADVANCES);
    const employees = getItems(STORAGE_KEYS.EMPLOYEES);
    
    // Find employee
    const employeeIndex = employees.findIndex(e => e.id === advanceData.employeeId);
    if (employeeIndex === -1) throw new Error('Employee not found');
    
    // Validate return amount
    if (advanceData.type === 'Returned' && advanceData.amount > employees[employeeIndex].advanceBalance) {
      throw new Error('Return amount cannot exceed current balance');
    }
    
    // Create advance record
    const newAdvance = {
      ...advanceData,
      id: generateId(advances),
      createdAt: new Date().toISOString()
    };
    advances.push(newAdvance);
    setItems(STORAGE_KEYS.ADVANCES, advances);
    
    // Update employee balance
    if (advanceData.type === 'Given') {
      employees[employeeIndex].advanceBalance = (employees[employeeIndex].advanceBalance || 0) + advanceData.amount;
    } else {
      employees[employeeIndex].advanceBalance = (employees[employeeIndex].advanceBalance || 0) - advanceData.amount;
    }
    setItems(STORAGE_KEYS.EMPLOYEES, employees);
    
    return { success: true, data: newAdvance, message: 'Advance recorded successfully' };
  },

  delete: async (id) => {
    await delay(300);
    const advances = getItems(STORAGE_KEYS.ADVANCES);
    const filtered = advances.filter(a => a.id !== parseInt(id));
    setItems(STORAGE_KEYS.ADVANCES, filtered);
    return { success: true, message: 'Advance record deleted' };
  }
};

// ============ HEALTH API ============
export const healthAPI = {
  // Vaccinations
  getVaccinations: async () => {
    await delay(300);
    const vaccinations = getItems(STORAGE_KEYS.VACCINATIONS);
    vaccinations.sort((a, b) => new Date(b.date) - new Date(a.date));
    return { success: true, data: vaccinations };
  },

  createVaccination: async (data) => {
    await delay(400);
    const vaccinations = getItems(STORAGE_KEYS.VACCINATIONS);
    const stocks = getItems(STORAGE_KEYS.STOCKS);
    
    // Deduct medicine quantities from stock
    data.medicines.forEach(med => {
      const stockIndex = stocks.findIndex(s => s.id === med.medicineId);
      if (stockIndex !== -1) {
        stocks[stockIndex].currentQty -= med.quantity;
      }
    });
    setItems(STORAGE_KEYS.STOCKS, stocks);
    
    const newRecord = {
      ...data,
      id: generateId(vaccinations),
      createdAt: new Date().toISOString()
    };
    vaccinations.push(newRecord);
    setItems(STORAGE_KEYS.VACCINATIONS, vaccinations);
    return { success: true, data: newRecord };
  },

  deleteVaccination: async (id) => {
    await delay(300);
    const vaccinations = getItems(STORAGE_KEYS.VACCINATIONS);
    const filtered = vaccinations.filter(v => v.id !== parseInt(id));
    setItems(STORAGE_KEYS.VACCINATIONS, filtered);
    return { success: true };
  },

  // Treatments
  getTreatments: async () => {
    await delay(300);
    const treatments = getItems(STORAGE_KEYS.TREATMENTS);
    treatments.sort((a, b) => new Date(b.date) - new Date(a.date));
    return { success: true, data: treatments };
  },

  createTreatment: async (data) => {
    await delay(400);
    const treatments = getItems(STORAGE_KEYS.TREATMENTS);
    const stocks = getItems(STORAGE_KEYS.STOCKS);
    
    // Deduct medicine quantities
    if (data.medicines) {
      data.medicines.forEach(med => {
        const stockIndex = stocks.findIndex(s => s.id === med.medicineId);
        if (stockIndex !== -1) {
          stocks[stockIndex].currentQty -= med.quantity;
        }
      });
      setItems(STORAGE_KEYS.STOCKS, stocks);
    }
    
    const newRecord = {
      ...data,
      id: generateId(treatments),
      createdAt: new Date().toISOString()
    };
    treatments.push(newRecord);
    setItems(STORAGE_KEYS.TREATMENTS, treatments);
    return { success: true, data: newRecord };
  },

  updateTreatment: async (id, data) => {
    await delay(300);
    const treatments = getItems(STORAGE_KEYS.TREATMENTS);
    const index = treatments.findIndex(t => t.id === parseInt(id));
    if (index === -1) throw new Error('Treatment not found');
    
    treatments[index] = { ...treatments[index], ...data };
    setItems(STORAGE_KEYS.TREATMENTS, treatments);
    return { success: true, data: treatments[index] };
  },

  deleteTreatment: async (id) => {
    await delay(300);
    const treatments = getItems(STORAGE_KEYS.TREATMENTS);
    const filtered = treatments.filter(t => t.id !== parseInt(id));
    setItems(STORAGE_KEYS.TREATMENTS, filtered);
    return { success: true };
  },

  // Dewormings
  getDewormings: async () => {
    await delay(300);
    const dewormings = getItems(STORAGE_KEYS.DEWORMINGS);
    dewormings.sort((a, b) => new Date(b.date) - new Date(a.date));
    return { success: true, data: dewormings };
  },

  createDeworming: async (data) => {
    await delay(400);
    const dewormings = getItems(STORAGE_KEYS.DEWORMINGS);
    const stocks = getItems(STORAGE_KEYS.STOCKS);
    
    // Deduct medicine quantities
    if (data.medicines) {
      data.medicines.forEach(med => {
        const stockIndex = stocks.findIndex(s => s.id === med.medicineId);
        if (stockIndex !== -1) {
          stocks[stockIndex].currentQty -= med.quantity;
        }
      });
      setItems(STORAGE_KEYS.STOCKS, stocks);
    }
    
    const newRecord = {
      ...data,
      id: generateId(dewormings),
      createdAt: new Date().toISOString()
    };
    dewormings.push(newRecord);
    setItems(STORAGE_KEYS.DEWORMINGS, dewormings);
    return { success: true, data: newRecord };
  },

  deleteDeworming: async (id) => {
    await delay(300);
    const dewormings = getItems(STORAGE_KEYS.DEWORMINGS);
    const filtered = dewormings.filter(d => d.id !== parseInt(id));
    setItems(STORAGE_KEYS.DEWORMINGS, filtered);
    return { success: true };
  },

  // Weight Records
  getWeightRecords: async () => {
    await delay(300);
    const records = getItems(STORAGE_KEYS.WEIGHT_RECORDS);
    records.sort((a, b) => new Date(b.date) - new Date(a.date));
    return { success: true, data: records };
  },

  createWeightRecord: async (data) => {
    await delay(400);
    const records = getItems(STORAGE_KEYS.WEIGHT_RECORDS);
    const newRecord = {
      ...data,
      id: generateId(records),
      createdAt: new Date().toISOString()
    };
    records.push(newRecord);
    setItems(STORAGE_KEYS.WEIGHT_RECORDS, records);
    return { success: true, data: newRecord };
  },

  // BCS Records
  getBcsRecords: async () => {
    await delay(300);
    const records = getItems(STORAGE_KEYS.BCS_RECORDS);
    records.sort((a, b) => new Date(b.date) - new Date(a.date));
    return { success: true, data: records };
  },

  createBcsRecord: async (data) => {
    await delay(400);
    const records = getItems(STORAGE_KEYS.BCS_RECORDS);
    const newRecord = {
      ...data,
      id: generateId(records),
      createdAt: new Date().toISOString()
    };
    records.push(newRecord);
    setItems(STORAGE_KEYS.BCS_RECORDS, records);
    return { success: true, data: newRecord };
  },

  // Hoof Records
  getHoofRecords: async () => {
    await delay(300);
    const records = getItems(STORAGE_KEYS.HOOF_RECORDS);
    records.sort((a, b) => new Date(b.date) - new Date(a.date));
    return { success: true, data: records };
  },

  createHoofRecord: async (data) => {
    await delay(400);
    const records = getItems(STORAGE_KEYS.HOOF_RECORDS);
    const newRecord = {
      ...data,
      id: generateId(records),
      createdAt: new Date().toISOString()
    };
    records.push(newRecord);
    setItems(STORAGE_KEYS.HOOF_RECORDS, records);
    return { success: true, data: newRecord };
  },

  updateHoofRecord: async (id, data) => {
    await delay(300);
    const records = getItems(STORAGE_KEYS.HOOF_RECORDS);
    const index = records.findIndex(r => r.id === parseInt(id));
    if (index === -1) throw new Error('Record not found');
    
    records[index] = { ...records[index], ...data };
    setItems(STORAGE_KEYS.HOOF_RECORDS, records);
    return { success: true, data: records[index] };
  },

  deleteHoofRecord: async (id) => {
    await delay(300);
    const records = getItems(STORAGE_KEYS.HOOF_RECORDS);
    const filtered = records.filter(r => r.id !== parseInt(id));
    setItems(STORAGE_KEYS.HOOF_RECORDS, filtered);
    return { success: true };
  }
};

// ============ FEED API ============
export const feedAPI = {
  // Recipes
  getAllRecipes: async () => {
    await delay(300);
    const recipes = getItems(STORAGE_KEYS.FEED_RECIPES);
    recipes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return { success: true, data: recipes };
  },

  getRecipeById: async (id) => {
    await delay(200);
    const recipes = getItems(STORAGE_KEYS.FEED_RECIPES);
    const recipe = recipes.find(r => r.id === parseInt(id));
    if (recipe) {
      return { success: true, data: recipe };
    }
    throw new Error('Recipe not found');
  },

  createRecipe: async (data) => {
    await delay(400);
    const recipes = getItems(STORAGE_KEYS.FEED_RECIPES);
    const newRecipe = {
      ...data,
      id: generateId(recipes),
      appliedCount: 0,
      createdAt: new Date().toISOString()
    };
    recipes.push(newRecipe);
    setItems(STORAGE_KEYS.FEED_RECIPES, recipes);
    return { success: true, data: newRecipe };
  },

  updateRecipe: async (id, data) => {
    await delay(400);
    const recipes = getItems(STORAGE_KEYS.FEED_RECIPES);
    const index = recipes.findIndex(r => r.id === parseInt(id));
    if (index === -1) throw new Error('Recipe not found');
    
    recipes[index] = { ...recipes[index], ...data };
    setItems(STORAGE_KEYS.FEED_RECIPES, recipes);
    return { success: true, data: recipes[index] };
  },

  deleteRecipe: async (id) => {
    await delay(300);
    const recipes = getItems(STORAGE_KEYS.FEED_RECIPES);
    const filtered = recipes.filter(r => r.id !== parseInt(id));
    setItems(STORAGE_KEYS.FEED_RECIPES, filtered);
    return { success: true };
  },

  // Applications
  getApplications: async () => {
    await delay(300);
    const applications = getItems(STORAGE_KEYS.FEED_APPLICATIONS);
    applications.sort((a, b) => new Date(b.date) - new Date(a.date));
    return { success: true, data: applications };
  },

  applyRecipe: async (data) => {
    await delay(400);
    const applications = getItems(STORAGE_KEYS.FEED_APPLICATIONS);
    const recipes = getItems(STORAGE_KEYS.FEED_RECIPES);
    const stocks = getItems(STORAGE_KEYS.STOCKS);
    
    // Deduct ingredients from stock
    if (data.ingredients) {
      data.ingredients.forEach(ing => {
        const stockIndex = stocks.findIndex(s => s.id === ing.stockId);
        if (stockIndex !== -1) {
          stocks[stockIndex].currentQty -= ing.quantity;
        }
      });
      setItems(STORAGE_KEYS.STOCKS, stocks);
    }
    
    // Update recipe applied count
    const recipeIndex = recipes.findIndex(r => r.id === data.recipeId);
    if (recipeIndex !== -1) {
      recipes[recipeIndex].appliedCount = (recipes[recipeIndex].appliedCount || 0) + 1;
      setItems(STORAGE_KEYS.FEED_RECIPES, recipes);
    }
    
    const newApplication = {
      ...data,
      id: generateId(applications),
      createdAt: new Date().toISOString()
    };
    applications.push(newApplication);
    setItems(STORAGE_KEYS.FEED_APPLICATIONS, applications);
    
    return { success: true, data: newApplication };
  }
};

// ============ CAPITAL API ============
export const capitalAPI = {
  get: async () => {
    await delay(300);
    const capital = JSON.parse(localStorage.getItem(STORAGE_KEYS.CAPITAL)) || mockCapital;
    return { success: true, data: capital };
  },

  update: async (amount, type, description) => {
    await delay(400);
    const capital = JSON.parse(localStorage.getItem(STORAGE_KEYS.CAPITAL)) || mockCapital;
    
    const newHistoryItem = {
      id: generateId(capital.history),
      amount,
      type,
      date: new Date().toISOString().split('T')[0],
      description
    };
    
    capital.history.push(newHistoryItem);
    
    if (amount > 0) {
      capital.totalCapital += amount;
      capital.availableAmount += amount;
    } else {
      capital.investedAmount += Math.abs(amount);
      capital.availableAmount += amount;
    }
    
    capital.lastUpdated = new Date().toISOString();
    
    localStorage.setItem(STORAGE_KEYS.CAPITAL, JSON.stringify(capital));
    return { success: true, data: capital, message: 'Capital updated successfully' };
  },

  setInitial: async (amount) => {
    await delay(400);
    const capital = {
      totalCapital: amount,
      investedAmount: 0,
      availableAmount: amount,
      lastUpdated: new Date().toISOString(),
      history: [{
        id: 1,
        amount,
        type: 'Initial Investment',
        date: new Date().toISOString().split('T')[0],
        description: 'Initial capital investment'
      }]
    };
    
    localStorage.setItem(STORAGE_KEYS.CAPITAL, JSON.stringify(capital));
    return { success: true, data: capital, message: 'Capital set successfully' };
  }
};

// ============ AUTH API (Mock) ============
export const authAPI = {
  login: async (email, password) => {
    await delay(500);
    // Mock authentication
    if (email && password) {
      const user = { ...mockUser, email };
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      localStorage.setItem('token', 'mock-jwt-token-' + Date.now());
      return { success: true, data: { user, token: 'mock-jwt-token' }, message: 'Login successful' };
    }
    throw new Error('Invalid credentials');
  },

  register: async (userData) => {
    await delay(500);
    const user = {
      ...mockUser,
      ...userData,
      id: Date.now(),
      createdAt: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    localStorage.setItem('token', 'mock-jwt-token-' + Date.now());
    return { success: true, data: { user, token: 'mock-jwt-token' }, message: 'Registration successful' };
  },

  logout: () => {
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem('token');
  },

  getUser: async () => {
    await delay(200);
    const user = JSON.parse(localStorage.getItem(STORAGE_KEYS.USER));
    if (user) {
      return { success: true, user };
    }
    return { success: false, user: null };
  }
};

// ============ DASHBOARD STATS ============
export const dashboardAPI = {
  getStats: async () => {
    await delay(300);
    const animals = getItems(STORAGE_KEYS.ANIMALS);
    const pens = getItems(STORAGE_KEYS.PENS);
    const stocks = getItems(STORAGE_KEYS.STOCKS);
    const employees = getItems(STORAGE_KEYS.EMPLOYEES);
    const capital = JSON.parse(localStorage.getItem(STORAGE_KEYS.CAPITAL)) || mockCapital;

    const activeAnimals = animals.filter(a => a.status === 'Active').length;
    const totalAnimalValue = animals.reduce((sum, a) => sum + (a.purchasePrice || 0), 0);
    const totalStockValue = stocks.reduce((sum, s) => sum + (s.currentQty * s.openingRatePerUnit), 0);

    return {
      success: true,
      data: {
        totalAnimals: animals.length,
        activeAnimals,
        totalPens: pens.length,
        totalStockItems: stocks.length,
        totalEmployees: employees.length,
        totalCapital: capital.totalCapital,
        availableCapital: capital.availableAmount,
        investedCapital: capital.investedAmount,
        totalAnimalValue,
        totalStockValue
      }
    };
  }
};
