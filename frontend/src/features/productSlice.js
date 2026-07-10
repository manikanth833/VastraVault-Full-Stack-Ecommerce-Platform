import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../services/api";

export const fetchProducts = createAsyncThunk("products/fetchAll", async (filters = {}, { rejectWithValue }) => {
  try {
    const params = new URLSearchParams();
    if (filters.search) params.append("search", filters.search);
    if (filters.category) params.append("category", filters.category);
    if (filters.min_price) params.append("min_price", filters.min_price);
    if (filters.max_price) params.append("max_price", filters.max_price);
    if (filters.min_rating) params.append("min_rating", filters.min_rating);
    if (filters.sort) params.append("sort", filters.sort);
    if (filters.my_products) params.append("my_products", filters.my_products);

    const res = await api.get(`/api/products/?${params.toString()}`);
    // Handle pagination wrapper from DRF
    return res.data.results !== undefined ? res.data.results : res.data;
  } catch (error) {
    return rejectWithValue(error.response?.data || "Failed to fetch products");
  }
});

export const fetchCategories = createAsyncThunk("products/fetchCategories", async (_, { rejectWithValue }) => {
  try {
    const res = await api.get("/api/categories/");
return res.data.results !== undefined ? res.data.results : res.data;  } catch (error) {
    return rejectWithValue(error.response?.data || "Failed to fetch categories");
  }
});

export const fetchProductDetail = createAsyncThunk("products/fetchDetail", async (slug, { rejectWithValue }) => {
  try {
    const res = await api.get(`/api/products/${slug}/`);
    return res.data;
  } catch (error) {
    return rejectWithValue(error.response?.data || "Failed to fetch product details");
  }
});

const initialState = {
  products: [],
  categories: [],
  currentProduct: null,
  loading: false,
  error: null,
};

const productSlice = createSlice({
  name: "products",
  initialState,
  reducers: {
    clearProductDetail: (state) => {
      state.currentProduct = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Products
      .addCase(fetchProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.products = action.payload;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch Categories
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.categories = action.payload;
      })
      // Fetch Product Detail
      .addCase(fetchProductDetail.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProductDetail.fulfilled, (state, action) => {
        state.loading = false;
        state.currentProduct = action.payload;
      })
      .addCase(fetchProductDetail.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearProductDetail } = productSlice.actions;
export default productSlice.reducer;
