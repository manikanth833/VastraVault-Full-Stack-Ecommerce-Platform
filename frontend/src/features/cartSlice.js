import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../services/api";

export const fetchCart = createAsyncThunk("cart/fetch", async (_, { rejectWithValue }) => {
  try {
    const res = await api.get("/api/orders/cart/current/");
    return res.data;
  } catch (error) {
    return rejectWithValue(error.response?.data || "Failed to fetch cart");
  }
});

export const addToCart = createAsyncThunk("cart/add", async ({ variant_id, quantity }, { rejectWithValue }) => {
  try {
    const res = await api.post("/api/orders/cart/add_item/", { variant_id, quantity });
    return res.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.error || "Failed to add to cart");
  }
});

export const updateCartItem = createAsyncThunk("cart/update", async ({ variant_id, quantity }, { rejectWithValue }) => {
  try {
    const res = await api.post("/api/orders/cart/update_item/", { variant_id, quantity });
    return res.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.error || "Failed to update item");
  }
});

export const removeFromCart = createAsyncThunk("cart/remove", async ({ variant_id }, { rejectWithValue }) => {
  try {
    const res = await api.post("/api/orders/cart/remove_item/", { variant_id });
    return res.data;
  } catch (error) {
    return rejectWithValue(error.response?.data || "Failed to remove item");
  }
});

const initialState = {
  cart: {
    items: [],
    subtotal: "0.00",
    tax: "0.00",
    shipping: "0.00",
    total: "0.00",
  },
  loading: false,
  error: null,
};

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    clearCartLocal: (state) => {
      state.cart = initialState.cart;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCart.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchCart.fulfilled, (state, action) => {
        state.loading = false;
        state.cart = action.payload;
        state.error = null;
      })
      .addCase(fetchCart.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Add
      .addCase(addToCart.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addToCart.fulfilled, (state, action) => {
        state.loading = false;
        state.cart = action.payload;
      })
      .addCase(addToCart.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update
      .addCase(updateCartItem.fulfilled, (state, action) => {
        state.cart = action.payload;
        state.error = null;
      })
      .addCase(updateCartItem.rejected, (state, action) => {
        state.error = action.payload;
      })
      // Remove
      .addCase(removeFromCart.fulfilled, (state, action) => {
        state.cart = action.payload;
      });
  },
});

export const { clearCartLocal } = cartSlice.actions;
export default cartSlice.reducer;
