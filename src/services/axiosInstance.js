import axios from "axios";
import authService from "./authService";

const END_POINT = process.env.REACT_APP_END_POINT || 'http://localhost:5000/api';

const axiosInstance = axios.create({
  baseURL: END_POINT,
  headers: {
    "Content-Type": "application/json",
  }
});

// Queue for failed requests waiting for token refresh
let isRefreshing = false;
let refreshSubscribers = [];

const onRefreshed = (token) => {
  refreshSubscribers.forEach(callback => {
    callback(token);
  });
  refreshSubscribers = [];
};

const addRefreshSubscriber = (callback) => {
  refreshSubscribers.push(callback);
};

// Request interceptor: Add token to headers
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor: Handle 401 with token refresh
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already refreshing, try to refresh the token
    if (
      error.response &&
      error.response.status === 401 &&
      !originalRequest._retry
    ) {
      if (isRefreshing) {
        // Wait for refresh to complete, then retry
        return new Promise((resolve) => {
          addRefreshSubscriber((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(axiosInstance(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Attempt to refresh the token
        const refreshToken = localStorage.getItem("refreshToken");
        if (!refreshToken) {
          throw new Error("No refresh token available");
        }

        const response = await authService.refreshToken();
        const { accessToken } = response.data?.data || response.data;

        if (accessToken) {
          localStorage.setItem("token", accessToken);
          axiosInstance.defaults.headers.Authorization = `Bearer ${accessToken}`;
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          isRefreshing = false;
          onRefreshed(accessToken);
          return axiosInstance(originalRequest);
        }
      } catch (err) {
        isRefreshing = false;
        refreshSubscribers = [];
        // Refresh failed, logout user
        authService.logout();
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
