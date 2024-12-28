// src/context/SearchContext.tsx

import React, { createContext, useContext, useState } from 'react';
import type { Product } from '../types';

interface SearchContextType {
  searchResults: Product[];
  setSearchResults: (results: Product[]) => void;
  searchImage: string | null;
  setSearchImage: (image: string | null) => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searchImage, setSearchImage] = useState<string | null>(null);

  return (
    <SearchContext.Provider value={{ 
      searchResults, 
      setSearchResults, 
      searchImage, 
      setSearchImage 
    }}>
      {children}
    </SearchContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSearch(): SearchContextType {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
}
