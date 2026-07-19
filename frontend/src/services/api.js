import axios from "axios";

const API_URL = "http://localhost:8000";
const GUEST_CART_TOKEN_KEY = "guestCartToken";
const AUTH_STORAGE_KEY = "user";

const isAuthenticatedSession = () => Boolean(localStorage.getItem(AUTH_STORAGE_KEY));
const clearGuestCartToken = () => localStorage.removeItem(GUEST_CART_TOKEN_KEY);

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    config.headers = config.headers || {};

    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Only send the guest cart token for anonymous sessions.
    if (!isAuthenticatedSession()) {
      const guestCartToken = localStorage.getItem(GUEST_CART_TOKEN_KEY);
      if (guestCartToken) {
        config.headers["X-Guest-Cart-Token"] = guestCartToken;
      }
    } else if (typeof config.headers.delete === "function") {
      config.headers.delete("X-Guest-Cart-Token");
    } else {
      delete config.headers["X-Guest-Cart-Token"];
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle JWT token expiration and refresh automatically
api.interceptors.response.use(
  (response) => {
    // Capture the guest cart token only while the session is anonymous.
    const guestToken = response.headers?.["x-guest-cart-token"];
    if (guestToken && !isAuthenticatedSession()) {
      localStorage.setItem(GUEST_CART_TOKEN_KEY, guestToken);
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
          clearGuestCartToken();
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
