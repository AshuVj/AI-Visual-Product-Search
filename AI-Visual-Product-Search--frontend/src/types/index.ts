// src/types/index.ts

export interface Product {
  id: string;
  title: string;
  price: number;
  currency: string; // Ensure currency is included
  platform: string;
  imageUrl: string;
  sourceLink: string;
}

export interface User {
  email: string;
  token: string;
  isAuthenticated: boolean;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

export interface WishlistState {
  items: Product[];
}
