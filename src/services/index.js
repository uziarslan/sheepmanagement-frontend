// Export all API services
export {
  animalAPI,
  penAPI,
  stockAPI,
  employeeAPI,
  advanceAPI,
  healthAPI,
  feedAPI,
  capitalAPI,
  authAPI,
  dashboardAPI
} from './api';

// Export axios instance for custom use
export { default as axiosInstance } from './axiosInstance';

// Export auth service
export { default as authService } from './authService';
