import axiosInstance from "./axiosInstance";

// 👇 Util to notify extension
const notifyExtensionWithToken = (token) => {
  try {
    window.postMessage({ type: "FROM_WEB_TO_EXTENSION", token }, window.location.origin);
  } catch (err) {
    if (typeof console !== 'undefined' && console.warn) {
      console.warn("Failed to notify extension:", err);
    }
  }
};

const register = async (userData) => {
  const response = await axiosInstance.post("/auth/register", {
    ...userData,
    confirmPassword: userData.password
  });
  
  if (response.data?.data?.tokens) {
    const { accessToken, refreshToken } = response.data.data.tokens;
    localStorage.setItem("token", accessToken);
    localStorage.setItem("refreshToken", refreshToken);
    notifyExtensionWithToken(accessToken);
  }
  
  return response;
};

const login = async (userData) => {
  const response = await axiosInstance.post("/auth/login", userData);
  
  if (response.data?.data?.tokens) {
    const { accessToken, refreshToken } = response.data.data.tokens;
    localStorage.setItem("token", accessToken);
    localStorage.setItem("refreshToken", refreshToken);
    notifyExtensionWithToken(accessToken);
  }
  
  return response;
};

const logout = async () => {
  try {
    await axiosInstance.post("/auth/logout");
  } catch (error) {
    // Ignore logout errors
  } finally {
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
  }
};

const getUser = async () => {
  const token = localStorage.getItem("token");
  if (token) {
    try {
      const response = await axiosInstance.get("/auth/me");
      return response.data?.data || response.data;
    } catch (error) {
      if (typeof console !== 'undefined' && console.error) {
        console.error("Error fetching user:", error);
      }
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      return null;
    }
  }
  return null;
};

const refreshToken = async () => {
  const storedRefreshToken = localStorage.getItem("refreshToken");
  if (!storedRefreshToken) {
    throw new Error("No refresh token available");
  }
  
  const response = await axiosInstance.post("/auth/refresh-token", {
    refreshToken: storedRefreshToken
  });
  
  if (response.data?.data) {
    const { accessToken, refreshToken: newRefreshToken } = response.data.data;
    localStorage.setItem("token", accessToken);
    localStorage.setItem("refreshToken", newRefreshToken);
    notifyExtensionWithToken(accessToken);
  }
  
  return response;
};

const changePassword = async (currentPassword, newPassword) => {
  const response = await axiosInstance.put("/auth/change-password", {
    currentPassword,
    newPassword,
    confirmPassword: newPassword
  });
  return response;
};

const updateProfile = async (profileData) => {
  const response = await axiosInstance.put("/auth/profile", profileData);
  return response;
};

const authService = {
  register,
  login,
  logout,
  getUser,
  refreshToken,
  changePassword,
  updateProfile
};

export default authService;
