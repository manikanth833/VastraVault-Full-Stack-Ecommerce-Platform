import axios from "axios";

const API_URL = "http://localhost:8000";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Attach Guest Cart token if present
    const guestCartToken = localStorage.getItem("guestCartToken");
    if (guestCartToken) {
      config.headers["X-Guest-Cart-Token"] = guestCartToken;
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle JWT token expiration and refresh automatically
api.interceptors.response.use(
  (response) => {
    // Capture guest cart token if sent by backend
    const guestToken = response.headers["x-guest-cart-token"];
    if (guestToken) {
      localStorage.setItem("guestCartToken", guestToken);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Check if error is 401 Unauthorized and not already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem("refreshToken");
      
      if (refreshToken) {
        try {
          const res = await axios.post(`${API_URL}/api/auth/token/refresh/`, {
            refresh: refreshToken,
          });
          
          const newAccess = res.data.access;
          localStorage.setItem("accessToken", newAccess);
          
          originalRequest.headers.Authorization = `Bearer ${newAccess}`;
          return api(originalRequest);
        } catch (refreshError) {
          // If refresh fails, clear auth data and redirect to login
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          localStorage.removeItem("user");
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
