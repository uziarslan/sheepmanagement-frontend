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
  USER: 'sheep_farm_user'
};

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
