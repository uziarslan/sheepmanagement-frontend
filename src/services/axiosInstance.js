import axios from "axios";
import authService from "./authService";

const END_POINT = process.env.REACT_APP_END_POINT || 'http://localhost:4000';

const axiosInstance = axios.create({
  baseURL: END_POINT,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// Request interceptor: Check for token on dashboard routes
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    // If the request is for a dashboard route and there's no token, redirect to login
    if (
      typeof window !== "undefined" &&
      window.location.pathname.includes("dashboard") &&
      !token
    ) {
      authService.logout();
      window.location.href = "/login";
    }
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor: Handle unauthorized (401) on dashboard routes
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (
      error.response &&
      error.response.status === 401 &&
      typeof window !== "undefined" &&
      window.location.pathname.includes("dashboard")
    ) {
      authService.logout();
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
