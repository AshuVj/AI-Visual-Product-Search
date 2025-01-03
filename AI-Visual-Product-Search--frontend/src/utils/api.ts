// src/utils/api.ts

import axios, { AxiosError } from 'axios';
import type { Product, User } from '../types';
import { store } from '../store';
import { logout } from '../store/authSlice';
import { clearAuthData } from './storage';
import { toast } from 'react-toastify';

// 1) Pull API_URL from environment
const API_URL = import.meta.env.VITE_API_URL || '/api';

// 2) Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// 3) Add request interceptor for auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token'); // Ensure this key matches your storage.ts
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 4) Add response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Check if the error is a 401 and if we haven't already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');

      if (refreshToken) {
        try {
          // Attempt to refresh the access token
          const response = await axios.post(
            `${API_URL}/refresh`,
            {},
            {
              headers: { Authorization: `Bearer ${refreshToken}` },
            }
          );
          const newAccessToken: string = response.data.access_token;

          // Update tokens in localStorage
          localStorage.setItem('token', newAccessToken);

          // Update the Authorization header for future requests
          api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
          originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;

          // Retry the original request with the new token
          return api(originalRequest);
        } catch (refreshError: unknown) {
          // Refresh token is invalid or expired, log out the user
          if (refreshError instanceof AxiosError && refreshError.response) {
            toast.error(refreshError.response.data.error || 'Token refresh failed.');
          } else if (refreshError instanceof Error) {
            toast.error(refreshError.message);
          } else {
            toast.error('Token refresh failed.');
          }

          store.dispatch(logout());
          clearAuthData();
          return Promise.reject(refreshError);
        }
      } else {
        // No refresh token available, log out the user
        toast.error('Session expired. Please log in again.');
        store.dispatch(logout());
        clearAuthData();
      }
    }

    return Promise.reject(error);
  }
);

// ---------------------------------------------
// ANALYZE IMAGE
// ---------------------------------------------

export interface AnalyzeImageResponse {
  products: Product[];
  search_terms: string[];
  // Add other fields if necessary
}

export const analyzeImage = async (file: File): Promise<AnalyzeImageResponse> => {
  // Create FormData for image upload
  const formData = new FormData();
  formData.append('image', file);

  try {
    // Make POST request to /analyze-image
    const response = await api.post<AnalyzeImageResponse>('/analyze-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      params: {
        // If your backend expects additional query parameters, include them here
        // For example:
        // countryCode: 'US',
        // currency: 'USD',
      },
    });

    // Return the response data
    return response.data; // Expected format: { products: [...], search_terms: [...], ... }
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      const message =
        error.response?.data?.error ||
        error.message ||
        'Image analysis failed.';
      console.error('Error analyzing image:', message);
      throw new Error(message);
    } else if (error instanceof Error) {
      console.error('Error analyzing image:', error.message);
      throw error;
    } else {
      console.error('Error analyzing image: Unknown error');
      throw new Error('Image analysis failed.');
    }
  }
};

// ---------------------------------------------
// SEARCH PRODUCTS (Text-Based Search)
// ---------------------------------------------

export const searchProducts = async (
  query: string,
  countryCode: string,
  currency: string
): Promise<{ products: Product[] }> => {
  try {
    // Make POST request to /search with query and parameters
    const response = await api.post<{ products: Product[] }>(
      '/search',
      { query },
      {
        params: { countryCode, currency },
      }
    );

    // Return the response data
    return response.data; // Expected format: { products: [...] }
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      const message =
        error.response?.data?.error ||
        error.message ||
        'Product search failed.';
      console.error('Error searching products:', message);
      throw new Error(message);
    } else if (error instanceof Error) {
      console.error('Error searching products:', error.message);
      throw error;
    } else {
      console.error('Error searching products: Unknown error');
      throw new Error('Product search failed.');
    }
  }
};

// ---------------------------------------------
// AUTHENTICATION FUNCTIONS
// ---------------------------------------------

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

export const login = async (email: string, password: string): Promise<AuthResponse> => {
  try {
    // Make POST request to /login
    const response = await api.post<AuthResponse>('/login', { email, password });
    return response.data; // Expected format: { access_token, refresh_token, user: {...} }
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      const message =
        error.response?.data?.error ||
        error.message ||
        'Login failed.';
      console.error('Login error:', message);
      throw new Error(message);
    } else if (error instanceof Error) {
      console.error('Login error:', error.message);
      throw error;
    } else {
      console.error('Login error: Unknown error');
      throw new Error('Login failed.');
    }
  }
};

export interface SignupResponse {
  message: string;
}

export const signup = async (
  username: string,
  email: string,
  password: string
): Promise<SignupResponse> => {
  try {
    // Make POST request to /register
    const response = await api.post<SignupResponse>('/register', { username, email, password });
    return response.data; // Expected format: { message: "User registered successfully" }
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      const message =
        error.response?.data?.error ||
        error.message ||
        'Signup failed.';
      console.error('Signup error:', message);
      throw new Error(message);
    } else if (error instanceof Error) {
      console.error('Signup error:', error.message);
      throw error;
    } else {
      console.error('Signup error: Unknown error');
      throw new Error('Signup failed.');
    }
  }
};

// ---------------------------------------------
// REFRESH TOKEN
// ---------------------------------------------

export const refreshAccessToken = async (): Promise<{ access_token: string }> => {
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) throw new Error('No refresh token available.');

  try {
    // Make POST request to /refresh
    const response = await api.post<{ access_token: string }>(
      '/refresh',
      {},
      {
        headers: { Authorization: `Bearer ${refreshToken}` },
      }
    );
    return response.data; // Expected format: { access_token }
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      const message =
        error.response?.data?.error ||
        error.message ||
        'Token refresh failed.';
      console.error('Refresh token error:', message);
      throw new Error(message);
    } else if (error instanceof Error) {
      console.error('Refresh token error:', error.message);
      throw error;
    } else {
      console.error('Refresh token error: Unknown error');
      throw new Error('Token refresh failed.');
    }
  }
};

// ---------------------------------------------
// WISHLIST FUNCTIONS
// ---------------------------------------------

export const getWishlist = async (): Promise<{ wishlist: Product[]; count: number }> => {
  try {
    // Make GET request to /wishlist-protected
    const response = await api.get<{ wishlist: Product[]; count: number }>('/wishlist-protected');
    return response.data; // Expected format: { wishlist: [...], count: n }
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      const message =
        error.response?.data?.error ||
        error.message ||
        'Failed to fetch wishlist.';
      console.error('Error fetching wishlist:', message);
      throw new Error(message);
    } else if (error instanceof Error) {
      console.error('Error fetching wishlist:', error.message);
      throw error;
    } else {
      console.error('Error fetching wishlist: Unknown error');
      throw new Error('Failed to fetch wishlist.');
    }
  }
};

export const addToWishlist = async (product: Product): Promise<unknown> => {
  try {
    // Make POST request to /wishlist-protected
    const response = await api.post('/wishlist-protected', {
      itemId: product.id,
      title: product.title,
      price: product.price,
      currency: product.currency, // Ensure currency is sent
      platform: product.platform,
      imageUrl: product.imageUrl,
      sourceLink: product.sourceLink, // Ensure sourceLink is sent
    });
    return response.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      const message =
        error.response?.data?.error ||
        error.message ||
        'Failed to add to wishlist.';
      console.error('Error adding to wishlist:', message);
      throw new Error(message);
    } else if (error instanceof Error) {
      console.error('Error adding to wishlist:', error.message);
      throw error;
    } else {
      console.error('Error adding to wishlist: Unknown error');
      throw new Error('Failed to add to wishlist.');
    }
  }
};

export const removeFromWishlist = async (productId: string): Promise<unknown> => {
  if (!productId) {
    throw new Error('Invalid productId.');
  }

  try {
    // Make DELETE request to /wishlist-protected with itemId as query param
    const response = await api.delete('/wishlist-protected', {
      params: { itemId: productId },
    });
    return response.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      const message =
        error.response?.data?.error ||
        error.message ||
        'Failed to remove from wishlist.';
      console.error('Error removing from wishlist:', message);
      throw new Error(message);
    } else if (error instanceof Error) {
      console.error('Error removing from wishlist:', error.message);
      throw error;
    } else {
      console.error('Error removing from wishlist: Unknown error');
      throw new Error('Failed to remove from wishlist.');
    }
  }
};
