// src/utils/api.ts

import axios from 'axios';
import type { Product } from '../types';
import { store } from '../store';
import { logout } from '../store/authSlice';
import { clearAuthData } from './storage';
import { toast } from 'react-toastify';

// 1) Pull API_URL from environment
const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000';

// 2) Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// 3) Add request interceptor for auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token'); // same key used in your 'storage.ts'
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 4) Add response interceptor to handle token refresh
api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');

      if (refreshToken) {
        try {
          const response = await axios.post(`${API_URL}/refresh`, {}, {
            headers: { 'Authorization': `Bearer ${refreshToken}` }
          });
          const newAccessToken = response.data.access_token;
          localStorage.setItem('token', newAccessToken);
          api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
          originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          // Refresh token is invalid, log out the user
          store.dispatch(logout());
          clearAuthData();
          toast.error('Session expired. Please log in again.');
          return Promise.reject(refreshError);
        }
      } else {
        // No refresh token, log out the user
        store.dispatch(logout());
        clearAuthData();
        toast.error('Session expired. Please log in again.');
      }
    }

    return Promise.reject(error);
  }
);

// ---------------------------------------------
// ANALYZE IMAGE
// ---------------------------------------------
// src/utils/api.ts

// ...

export const analyzeImage = async (file: File) => {
  // Set default values
  const defaultCountryCode = 'US';
  const defaultCurrency = 'USD';

  // Upload a file to /analyze-image with query params
  const formData = new FormData();
  formData.append('image', file);

  // Make POST request with query params
  const response = await api.post('/analyze-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    params: { 
      countryCode: defaultCountryCode, 
      currency: defaultCurrency 
    },
  });
  // Return the data from backend
  return response.data; 
  // Expecting { products: [...], search_terms: [...], ... } 
};

// ---------------------------------------------
// LOGIN
// ---------------------------------------------
export const login = async (email: string, password: string) => {
  // POST /login
  const response = await api.post('/login', { email, password });
  return response.data; // { access_token, refresh_token }
};

// ---------------------------------------------
// SIGNUP
// ---------------------------------------------
export const signup = async (username: string, email: string, password: string) => {
  // POST /register
  const response = await api.post('/register', { username, email, password });
  return response.data; // { message: "User registered successfully" }
};

// ---------------------------------------------
// REFRESH TOKEN
// ---------------------------------------------
export const refreshAccessToken = async () => {
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) throw new Error('No refresh token available');

  const response = await api.post('/refresh', {}, {
    headers: { 'Authorization': `Bearer ${refreshToken}` }
  });
  return response.data; // { access_token }
};

// ---------------------------------------------
// WISHLIST
// ---------------------------------------------
export const getWishlist = async () => {
  // GET /wishlist-protected
  const response = await api.get('/wishlist-protected');
  return response.data; // e.g., { wishlist: [...], count: n }
};

export const addToWishlist = async (product: Product) => {
  const response = await api.post('/wishlist-protected', { 
    itemId: product.id,
    title: product.title,
    price: product.price,
    currency: product.currency, // Ensure currency is sent
    platform: product.platform,
    imageUrl: product.imageUrl,
    sourceLink: product.sourceLink,  // Ensure sourceLink is sent
  });
  return response.data;
};

export const removeFromWishlist = async (productId: string) => {
  if (!productId) {
    throw new Error('Invalid productId');
  }

  try {
    const response = await api.delete(`/wishlist-protected`, {
      params: { itemId: productId }
    });
    return response.data;
  } catch (error) {
    console.error('Error removing from wishlist:', error);
    throw error; // Rethrow to handle in the component
  }
};
