// Real API Service - Connects to backend server
import axiosInstance from './axiosInstance';

// Helper to handle API responses
const handleResponse = (response) => {
  return response.data;
};

// Helper to handle API errors
const handleError = (error) => {
  const message = error.response?.data?.message || error.message || 'An error occurred';
  throw new Error(message);
};

// Helper to transform animal data for frontend (backend -> frontend)
const transformAnimalFromBackend = (animal) => {
  if (!animal) return animal;
  return {
    ...animal,
    penId: animal.pen?.id || animal.pen?._id || animal.pen || animal.penId
  };
};

// Helper to transform animal data for backend (frontend -> backend)
const transformAnimalForBackend = (animalData) => {
  const data = { ...animalData };
  // Map penId to pen for backend
  if (data.penId) {
    data.pen = data.penId;
    delete data.penId;
  }
  return data;
};

// ============ ANIMAL API ============
export const animalAPI = {
  getAll: async (params = {}) => {
    try {
      const response = await axiosInstance.get('/animals', { params });
      const result = handleResponse(response);
      // Transform animals for frontend
      if (result.data && Array.isArray(result.data)) {
        result.data = result.data.map(transformAnimalFromBackend);
      }
      return result;
    } catch (error) {
      return handleError(error);
    }
  },

  getById: async (id) => {
    try {
      const response = await axiosInstance.get(`/animals/${id}`);
      const result = handleResponse(response);
      if (result.data) {
        result.data = transformAnimalFromBackend(result.data);
      }
      return result;
    } catch (error) {
      return handleError(error);
    }
  },

  create: async (animalData) => {
    try {
      const response = await axiosInstance.post('/animals', transformAnimalForBackend(animalData));
      const result = handleResponse(response);
      if (result.data) {
        result.data = transformAnimalFromBackend(result.data);
      }
      return result;
    } catch (error) {
      return handleError(error);
    }
  },

  bulkCreate: async (animals) => {
    try {
      const transformedAnimals = animals.map(transformAnimalForBackend);
      const response = await axiosInstance.post('/animals/bulk', { animals: transformedAnimals });
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  update: async (id, animalData) => {
    try {
      const response = await axiosInstance.put(`/animals/${id}`, transformAnimalForBackend(animalData));
      const result = handleResponse(response);
      if (result.data) {
        result.data = transformAnimalFromBackend(result.data);
      }
      return result;
    } catch (error) {
      return handleError(error);
    }
  },

  delete: async (id) => {
    try {
      const response = await axiosInstance.delete(`/animals/${id}`);
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  moveToPen: async (animalId, penId) => {
    try {
      const response = await axiosInstance.put(`/animals/${animalId}/move-to-pen`, { penId });
      const result = handleResponse(response);
      if (result.data) {
        result.data = transformAnimalFromBackend(result.data);
      }
      return result;
    } catch (error) {
      return handleError(error);
    }
  },

  getByPen: async (penId) => {
    try {
      const response = await axiosInstance.get(`/animals/pen/${penId}`);
      const result = handleResponse(response);
      if (result.data && Array.isArray(result.data)) {
        result.data = result.data.map(transformAnimalFromBackend);
      }
      return result;
    } catch (error) {
      return handleError(error);
    }
  },

  declareDead: async (animalId, deathData) => {
    try {
      const response = await axiosInstance.put(`/animals/${animalId}/declare-dead`, deathData);
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  }
};

// ============ PEN API ============
export const penAPI = {
  getAll: async (params = {}) => {
    try {
      const response = await axiosInstance.get('/pens', { params });
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  getById: async (id) => {
    try {
      const response = await axiosInstance.get(`/pens/${id}`);
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  create: async (penData) => {
    try {
      const response = await axiosInstance.post('/pens', penData);
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  update: async (id, penData) => {
    try {
      const response = await axiosInstance.put(`/pens/${id}`, penData);
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  delete: async (id) => {
    try {
      const response = await axiosInstance.delete(`/pens/${id}`);
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  getStats: async () => {
    try {
      const response = await axiosInstance.get('/pens/stats');
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  }
};

// ============ STOCK API ============
export const stockAPI = {
  getAll: async (params = {}) => {
    try {
      const response = await axiosInstance.get('/stocks', { params });
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  getById: async (id) => {
    try {
      const response = await axiosInstance.get(`/stocks/${id}`);
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  create: async (stockData) => {
    try {
      const response = await axiosInstance.post('/stocks', stockData);
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  update: async (id, stockData) => {
    try {
      const response = await axiosInstance.put(`/stocks/${id}`, stockData);
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  delete: async (id) => {
    try {
      const response = await axiosInstance.delete(`/stocks/${id}`);
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  adjustStock: async (id, quantity, type, reason) => {
    try {
      const response = await axiosInstance.post(`/stocks/${id}/adjust`, { quantity, type, reason });
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  getLowStock: async () => {
    try {
      const response = await axiosInstance.get('/stocks/low-stock');
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  getByCategory: async (category) => {
    try {
      const response = await axiosInstance.get(`/stocks/category/${category}`);
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  getSummary: async () => {
    try {
      const response = await axiosInstance.get('/stocks/summary');
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  }
};

// ============ EMPLOYEE API ============
export const employeeAPI = {
  getAll: async (params = {}) => {
    try {
      const response = await axiosInstance.get('/employees', { params });
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  getById: async (id) => {
    try {
      const response = await axiosInstance.get(`/employees/${id}`);
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  create: async (employeeData) => {
    try {
      const response = await axiosInstance.post('/employees', employeeData);
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  update: async (id, employeeData) => {
    try {
      const response = await axiosInstance.put(`/employees/${id}`, employeeData);
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  delete: async (id) => {
    try {
      const response = await axiosInstance.delete(`/employees/${id}`);
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  resetPassword: async (id, newPassword) => {
    try {
      const response = await axiosInstance.patch(`/employees/${id}/reset-password`, {
        newPassword,
        confirmPassword: newPassword
      });
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  getWithAdvances: async () => {
    try {
      const response = await axiosInstance.get('/employees/with-advances');
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  getSummary: async () => {
    try {
      const response = await axiosInstance.get('/employees/summary');
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  }
};

// ============ ADVANCE API ============
export const advanceAPI = {
  getAll: async (params = {}) => {
    try {
      const response = await axiosInstance.get('/advances', { params });
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  getByEmployeeId: async (employeeId) => {
    try {
      const response = await axiosInstance.get(`/advances/employee/${employeeId}`);
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  create: async (advanceData) => {
    try {
      // Transform employeeId to employee for backend
      const data = { ...advanceData };
      if (data.employeeId) {
        data.employee = data.employeeId;
        delete data.employeeId;
      }
      const response = await axiosInstance.post('/advances', data);
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  delete: async (id) => {
    try {
      const response = await axiosInstance.delete(`/advances/${id}`);
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  getSummary: async (startDate, endDate) => {
    try {
      const response = await axiosInstance.get('/advances/summary', { 
        params: { startDate, endDate } 
      });
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  }
};

// Helper to transform health data for backend
const transformHealthDataForBackend = (data) => {
  const transformed = { ...data };
  
  // Map penId to pen, animalId to animal
  if (transformed.penId) {
    transformed.pen = transformed.penId;
    delete transformed.penId;
  }
  if (transformed.animalId) {
    transformed.animal = transformed.animalId;
    delete transformed.animalId;
  }
  
  // Transform medicines: map medicineId to medicine
  if (transformed.medicines && Array.isArray(transformed.medicines)) {
    transformed.medicines = transformed.medicines.map(med => ({
      ...med,
      medicine: med.medicineId || med.medicine,
      medicineId: undefined
    }));
  }
  
  return transformed;
};

// ============ HEALTH API ============
export const healthAPI = {
  // Vaccinations
  getVaccinations: async (params = {}) => {
    try {
      const response = await axiosInstance.get('/health/vaccinations', { params });
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  createVaccination: async (data) => {
    try {
      const response = await axiosInstance.post('/health/vaccinations', transformHealthDataForBackend(data));
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  deleteVaccination: async (id) => {
    try {
      const response = await axiosInstance.delete(`/health/vaccinations/${id}`);
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  // Treatments
  getTreatments: async (params = {}) => {
    try {
      const response = await axiosInstance.get('/health/treatments', { params });
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  createTreatment: async (data) => {
    try {
      const response = await axiosInstance.post('/health/treatments', transformHealthDataForBackend(data));
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  updateTreatment: async (id, data) => {
    try {
      const response = await axiosInstance.put(`/health/treatments/${id}`, data);
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  deleteTreatment: async (id) => {
    try {
      const response = await axiosInstance.delete(`/health/treatments/${id}`);
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  // Dewormings
  getDewormings: async (params = {}) => {
    try {
      const response = await axiosInstance.get('/health/dewormings', { params });
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  createDeworming: async (data) => {
    try {
      const response = await axiosInstance.post('/health/dewormings', transformHealthDataForBackend(data));
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  deleteDeworming: async (id) => {
    try {
      const response = await axiosInstance.delete(`/health/dewormings/${id}`);
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  // Weight Records
  getWeightRecords: async (params = {}) => {
    try {
      const response = await axiosInstance.get('/health/weight-records', { params });
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  createWeightRecord: async (data) => {
    try {
      const response = await axiosInstance.post('/health/weight-records', data);
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  // BCS Records
  getBcsRecords: async (params = {}) => {
    try {
      const response = await axiosInstance.get('/health/bcs-records', { params });
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  createBcsRecord: async (data) => {
    try {
      const response = await axiosInstance.post('/health/bcs-records', data);
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  // Hoof Records
  getHoofRecords: async (params = {}) => {
    try {
      const response = await axiosInstance.get('/health/hoof-records', { params });
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  createHoofRecord: async (data) => {
    try {
      const response = await axiosInstance.post('/health/hoof-records', data);
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  updateHoofRecord: async (id, data) => {
    try {
      const response = await axiosInstance.put(`/health/hoof-records/${id}`, data);
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  deleteHoofRecord: async (id) => {
    try {
      const response = await axiosInstance.delete(`/health/hoof-records/${id}`);
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  // Cure Tracking
  getCureTracking: async (params = {}) => {
    try {
      const response = await axiosInstance.get('/health/cure-tracking', { params });
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  }
};

// Helper to transform recipe data for backend
const transformRecipeForBackend = (data) => {
  const transformed = { ...data };
  // Map penId to pen
  if (transformed.penId) {
    transformed.pen = transformed.penId;
    delete transformed.penId;
  }
  // Transform ingredients: map stockId to stock
  if (transformed.ingredients && Array.isArray(transformed.ingredients)) {
    transformed.ingredients = transformed.ingredients.map(ing => ({
      ...ing,
      stock: ing.stockId || ing.stock,
      stockId: undefined
    }));
  }
  return transformed;
};

// Helper to transform recipe data from backend
const transformRecipeFromBackend = (recipe) => {
  if (!recipe) return recipe;
  return {
    ...recipe,
    penId: recipe.pen?.id || recipe.pen?._id || recipe.pen || recipe.penId
  };
};

// ============ FEED API ============
export const feedAPI = {
  // Recipes
  getAllRecipes: async (params = {}) => {
    try {
      const response = await axiosInstance.get('/feed/recipes', { params });
      const result = handleResponse(response);
      if (result.data && Array.isArray(result.data)) {
        result.data = result.data.map(transformRecipeFromBackend);
      }
      return result;
    } catch (error) {
      return handleError(error);
    }
  },

  getRecipeById: async (id) => {
    try {
      const response = await axiosInstance.get(`/feed/recipes/${id}`);
      const result = handleResponse(response);
      if (result.data) {
        result.data = transformRecipeFromBackend(result.data);
      }
      return result;
    } catch (error) {
      return handleError(error);
    }
  },

  createRecipe: async (data) => {
    try {
      const response = await axiosInstance.post('/feed/recipes', transformRecipeForBackend(data));
      const result = handleResponse(response);
      if (result.data) {
        result.data = transformRecipeFromBackend(result.data);
      }
      return result;
    } catch (error) {
      return handleError(error);
    }
  },

  updateRecipe: async (id, data) => {
    try {
      const response = await axiosInstance.put(`/feed/recipes/${id}`, transformRecipeForBackend(data));
      const result = handleResponse(response);
      if (result.data) {
        result.data = transformRecipeFromBackend(result.data);
      }
      return result;
    } catch (error) {
      return handleError(error);
    }
  },

  deleteRecipe: async (id) => {
    try {
      const response = await axiosInstance.delete(`/feed/recipes/${id}`);
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  // Applications
  getApplications: async (params = {}) => {
    try {
      const response = await axiosInstance.get('/feed/applications', { params });
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  applyRecipe: async (data) => {
    try {
      const transformedData = {
        ...data,
        recipe: data.recipeId || data.recipe,
        pen: data.penId || data.pen
      };
      delete transformedData.recipeId;
      delete transformedData.penId;
      
      const response = await axiosInstance.post('/feed/applications', transformedData);
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  }
};

// ============ CAPITAL API ============
export const capitalAPI = {
  get: async () => {
    try {
      const response = await axiosInstance.get('/capital');
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  initialize: async (amount) => {
    try {
      const response = await axiosInstance.post('/capital/initialize', { amount });
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  update: async (amount, type, description) => {
    try {
      const response = await axiosInstance.put('/capital', { amount, type, description });
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  getTransactions: async (params = {}) => {
    try {
      const response = await axiosInstance.get('/capital/transactions', { params });
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  getSummary: async () => {
    try {
      const response = await axiosInstance.get('/capital/summary');
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  setInitial: async (amount) => {
    try {
      const response = await axiosInstance.post('/capital/initialize', { amount });
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  }
};

// ============ SALARY API ============
export const salaryAPI = {
  getAll: async (params = {}) => {
    try {
      const response = await axiosInstance.get('/salaries', { params });
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  create: async (data) => {
    try {
      const response = await axiosInstance.post('/salaries', data);
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  }
};

// ============ AUDIT API ============
export const auditAPI = {
  getAll: async (params = {}) => {
    try {
      const response = await axiosInstance.get('/audit-logs', { params });
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  }
};

// ============ USER API ============
export const userAPI = {
  create: async (userData) => {
    try {
      const response = await axiosInstance.post('/users', userData);
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  }
};

// ============ AUTH API ============
export const authAPI = {
  login: async (email, password) => {
    try {
      const response = await axiosInstance.post('/auth/login', { email, password });
      const data = handleResponse(response);
      
      // Store tokens
      if (data.data?.tokens) {
        localStorage.setItem('token', data.data.tokens.accessToken);
        localStorage.setItem('refreshToken', data.data.tokens.refreshToken);
      }
      
      return data;
    } catch (error) {
      return handleError(error);
    }
  },

  register: async (userData) => {
    try {
      const response = await axiosInstance.post('/auth/register', {
        ...userData,
        confirmPassword: userData.password
      });
      const data = handleResponse(response);
      
      // Store tokens
      if (data.data?.tokens) {
        localStorage.setItem('token', data.data.tokens.accessToken);
        localStorage.setItem('refreshToken', data.data.tokens.refreshToken);
      }
      
      return data;
    } catch (error) {
      return handleError(error);
    }
  },

  logout: async () => {
    try {
      await axiosInstance.post('/auth/logout');
    } catch (error) {
      // Ignore logout errors
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
    }
  },

  getUser: async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return { success: false, user: null };
      }
      
      const response = await axiosInstance.get('/auth/me');
      const data = handleResponse(response);
      return { success: true, user: data.data };
    } catch (error) {
      return { success: false, user: null };
    }
  },

  refreshToken: async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        throw new Error('No refresh token');
      }
      
      const response = await axiosInstance.post('/auth/refresh-token', { refreshToken });
      const data = handleResponse(response);
      
      if (data.data) {
        localStorage.setItem('token', data.data.accessToken);
        localStorage.setItem('refreshToken', data.data.refreshToken);
      }
      
      return data;
    } catch (error) {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      return handleError(error);
    }
  },

  changePassword: async (currentPassword, newPassword) => {
    try {
      const response = await axiosInstance.put('/auth/change-password', {
        currentPassword,
        newPassword,
        confirmPassword: newPassword
      });
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  updateProfile: async (profileData) => {
    try {
      const response = await axiosInstance.put('/auth/profile', profileData);
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  }
};

// ============ DASHBOARD API ============
export const dashboardAPI = {
  getStats: async () => {
    try {
      const response = await axiosInstance.get('/dashboard/stats');
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  getActivities: async (limit = 10) => {
    try {
      const response = await axiosInstance.get('/dashboard/activities', { params: { limit } });
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  }
};

// ============ VACCINATION API ============
export const vaccinationAPI = {
  // Vaccines (Stock items with category=Medication)
  getAllVaccines: async (params = {}) => {
    try {
      const response = await axiosInstance.get('/vaccination/vaccines', { params });
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  getVaccineById: async (id) => {
    try {
      const response = await axiosInstance.get(`/vaccination/vaccines/${id}`);
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  createVaccine: async (data) => {
    try {
      const response = await axiosInstance.post('/vaccination/vaccines', data);
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  updateVaccine: async (id, data) => {
    try {
      const response = await axiosInstance.put(`/vaccination/vaccines/${id}`, data);
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  deleteVaccine: async (id) => {
    try {
      const response = await axiosInstance.delete(`/vaccination/vaccines/${id}`);
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  // Applications
  getApplications: async (params = {}) => {
    try {
      const response = await axiosInstance.get('/vaccination/applications', { params });
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  applyVaccine: async (data) => {
    try {
      const response = await axiosInstance.post('/vaccination/applications', data);
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  getApplicationById: async (id) => {
    try {
      const response = await axiosInstance.get(`/vaccination/applications/${id}`);
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  deleteApplication: async (id) => {
    try {
      const response = await axiosInstance.delete(`/vaccination/applications/${id}`);
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  }
};
