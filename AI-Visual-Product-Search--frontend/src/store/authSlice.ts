// src/store/authSlice.ts

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { clearAuthData } from '../utils/storage';
import type { AuthState, User } from '../types';

const initialState: AuthState = {
  user: null, // Allow user to be null initially
  token: null,
  isAuthenticated: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ user: User | null; token: string }>
    ) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = !!action.payload.token;
    },
    logout: (state) => {
      clearAuthData();
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;
