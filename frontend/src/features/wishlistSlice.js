import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../services/api";

export const fetchWishlist = createAsyncThunk("wishlist/fetch", async (_, { rejectWithValue }) => {
  try {
    const res = await api.get("/api/orders/wishlist/");
    return res.data.results !== undefined ? res.data.results : res.data;
  } catch (error) {
    return rejectWithValue(error.response?.data || "Failed to fetch wishlist");
  }
});

export const addWishlistItem = createAsyncThunk(
  "wishlist/add",
  async (variantId, { rejectWithValue }) => {
    try {
      const res = await api.post("/api/orders/wishlist/", { variant_id: variantId });
      return res.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.detail ||
          error.response?.data?.message ||
          error.response?.data ||
          "Failed to add to wishlist"
      );
    }
  }
);

export const removeWishlistItem = createAsyncThunk(
  "wishlist/remove",
  async (wishlistItemId, { rejectWithValue }) => {
    try {
      await api.delete(`/api/orders/wishlist/${wishlistItemId}/`);
      return wishlistItemId;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.detail ||
          error.response?.data?.message ||
          error.response?.data ||
          "Failed to remove from wishlist"
      );
    }
  }
);

const initialState = {
  items: [],
  loading: false,
  error: null,
  pendingVariantIds: [],
  pendingItemIds: [],
};

const addPendingId = (ids, id) => {
  const normalizedId = String(id);
  if (!ids.includes(normalizedId)) {
    ids.push(normalizedId);
  }
};

const removePendingId = (ids, id) => {
  const normalizedId = String(id);
  return ids.filter((pendingId) => String(pendingId) !== normalizedId);
};

const wishlistSlice = createSlice({
  name: "wishlist",
  initialState,
  reducers: {
    clearWishlist: (state) => {
      state.items = [];
      state.loading = false;
      state.error = null;
      state.pendingVariantIds = [];
      state.pendingItemIds = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWishlist.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchWishlist.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
        state.error = null;
      })
      .addCase(fetchWishlist.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(addWishlistItem.pending, (state, action) => {
        addPendingId(state.pendingVariantIds, action.meta.arg);
        state.error = null;
      })
      .addCase(addWishlistItem.fulfilled, (state, action) => {
        state.pendingVariantIds = removePendingId(state.pendingVariantIds, action.meta.arg);

        const item = action.payload;
        if (item && item.id != null) {
          const existingIndex = state.items.findIndex((wishlistItem) => String(wishlistItem.id) === String(item.id));
          if (existingIndex >= 0) {
            state.items[existingIndex] = item;
          } else {
            const existingVariantIndex = state.items.findIndex(
              (wishlistItem) => String(wishlistItem.variant) === String(item.variant)
            );
            if (existingVariantIndex >= 0) {
              state.items[existingVariantIndex] = item;
            } else {
              state.items.unshift(item);
            }
          }
        }

        state.error = null;
      })
      .addCase(addWishlistItem.rejected, (state, action) => {
        state.pendingVariantIds = removePendingId(state.pendingVariantIds, action.meta.arg);
        state.error = action.payload;
      })
      .addCase(removeWishlistItem.pending, (state, action) => {
        addPendingId(state.pendingItemIds, action.meta.arg);
        state.error = null;
      })
      .addCase(removeWishlistItem.fulfilled, (state, action) => {
        state.pendingItemIds = removePendingId(state.pendingItemIds, action.meta.arg);
        state.items = state.items.filter((item) => String(item.id) !== String(action.meta.arg));
        state.error = null;
      })
      .addCase(removeWishlistItem.rejected, (state, action) => {
        state.pendingItemIds = removePendingId(state.pendingItemIds, action.meta.arg);
        state.error = action.payload;
      });
  },
});

export const { clearWishlist } = wishlistSlice.actions;
export default wishlistSlice.reducer;
