import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../services/api";

const GUEST_CART_TOKEN_KEY = "guestCartToken";
const USER_STORAGE_KEY = "user";
const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";

export const login = createAsyncThunk("auth/login", async (credentials, { rejectWithValue }) => {
  try {
    const res = await api.post("/api/auth/login/", credentials);

    localStorage.setItem(ACCESS_TOKEN_KEY, res.data.access);
    localStorage.setItem(REFRESH_TOKEN_KEY, res.data.refresh);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(res.data.user));

    // Check if guest cart needs to be merged
    const guestToken = localStorage.getItem(GUEST_CART_TOKEN_KEY);
    if (guestToken) {
      try {
        await api.post("/api/orders/cart/merge/", { guest_token: guestToken });
        localStorage.removeItem(GUEST_CART_TOKEN_KEY);
      } catch (mergeError) {
        // Keep the token if merge fails so the cart can be retried later.
        void mergeError;
      }
    }

    return res.data.user;
  } catch (error) {
    return rejectWithValue(error.response?.data || "Invalid email or password");
  }
});

export const registerUser = createAsyncThunk("auth/register", async (userData, { rejectWithValue }) => {
  try {
    const res = await api.post("/api/auth/register/", userData);
    return res.data;
  } catch (error) {
    return rejectWithValue(error.response?.data || "Registration failed");
  }
});

export const fetchProfile = createAsyncThunk("auth/profile", async (_, { rejectWithValue }) => {
  try {
    const res = await api.get("/api/auth/profile/");
    localStorage.setItem("user", JSON.stringify(res.data));
    return res.data;
  } catch (error) {
    return rejectWithValue(error.response?.data || "Failed to fetch profile");
  }
});

const storedUser = localStorage.getItem(USER_STORAGE_KEY);
const initialState = {
  user: storedUser ? JSON.parse(storedUser) : null,
  isAuthenticated: !!storedUser,
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout: (state) => {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      localStorage.removeItem(USER_STORAGE_KEY);
      localStorage.removeItem(GUEST_CART_TOKEN_KEY);
      state.user = null;
      state.isAuthenticated = false;
      state.error = null;
    },
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Register
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Profile
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.user = action.payload;
      });
  },
});

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer;
