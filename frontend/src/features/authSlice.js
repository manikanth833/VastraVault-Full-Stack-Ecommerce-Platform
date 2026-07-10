import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../services/api";

export const login = createAsyncThunk("auth/login", async (credentials, { rejectWithValue, dispatch }) => {
  try {
    const res = await api.post("/api/auth/login/", credentials);
    localStorage.setItem("accessToken", res.data.access);
    localStorage.setItem("refreshToken", res.data.refresh);
    localStorage.setItem("user", JSON.stringify(res.data.user));
    
    // Check if guest cart needs to be merged
    const guestToken = localStorage.getItem("guestCartToken");
    if (guestToken) {
      await api.post("/api/orders/cart/merge/", { guest_token: guestToken });
      localStorage.removeItem("guestCartToken");
    }
    
    return res.data.user;
  } catch (error) {
    return rejectWithValue(error.response?.data?.detail || "Invalid email or password");
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

const storedUser = localStorage.getItem("user");
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
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
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
