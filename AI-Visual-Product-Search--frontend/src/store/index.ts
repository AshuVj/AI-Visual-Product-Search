// src/store/index.ts

import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import wishlistReducer from './wishlistSlice';
// import geolocationReducer from './GeolocationSlice'; // Removed
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import storage from 'redux-persist/lib/storage'; // defaults to localStorage for web

// Configuration for persisting the auth slice
const authPersistConfig = {
  key: 'auth',
  storage: storage,
  whitelist: ['user', 'token', 'isAuthenticated'],
};

// Configuration for persisting the wishlist slice
const wishlistPersistConfig = {
  key: 'wishlist',
  storage: storage,
  whitelist: ['items'],
};

// Configuration for persisting the geolocation slice
// const geolocationPersistConfig = {
//   key: 'geolocation',
//   storage: storage,
//   whitelist: ['countryCode', 'currency'],
// };

// Create persisted reducers
const persistedAuthReducer = persistReducer(authPersistConfig, authReducer);
const persistedWishlistReducer = persistReducer(wishlistPersistConfig, wishlistReducer);
// const persistedGeolocationReducer = persistReducer(geolocationPersistConfig, geolocationReducer); // Removed

// Configure the store with persisted reducers
export const store = configureStore({
  reducer: {
    auth: persistedAuthReducer,
    wishlist: persistedWishlistReducer,
    // geolocation: persistedGeolocationReducer, // Removed
    // Add other reducers here
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore redux-persist actions to prevent warnings
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

// Export persistor for use in the app
export const persistor = persistStore(store);

// Define RootState and AppDispatch types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
