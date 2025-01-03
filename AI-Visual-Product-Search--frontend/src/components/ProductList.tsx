// src/components/ProductList.tsx

import React, { useState } from 'react';
import ProductCard from './ProductCard';
import type { Product } from '../types';
import { analyzeImage, searchProducts } from '../utils/api'; // Import the centralized API functions

const ProductList: React.FC = () => {
  // Removed geolocation selectors
  // const { countryCode, currency } = useSelector((state: RootState) => state.geolocation);

  // Set default values if geolocation is not used
  const defaultCountryCode = 'US';
  const defaultCurrency = 'USD';

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null); // For image-based search

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedImage(e.target.files[0]);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm && !selectedImage) {
      setError('Please enter a search term or upload an image.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let data;

      if (selectedImage) {
        // Image-based search
        data = await analyzeImage(selectedImage);
      } else {
        // Text-based search
        data = await searchProducts(searchTerm, defaultCountryCode, defaultCurrency);
      }

      // Ensure that the backend returns products with the 'currency' field
      if (data && Array.isArray(data.products)) {
        setProducts(data.products);
      } else {
        setError('Invalid response from server.');
      }
    } catch (err: unknown) {
      // Since errors are handled and thrown in api.ts, simply set the error message
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to fetch products. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="product-list p-4">
      <div className="search-bar mb-6">
        <div className="flex flex-col md:flex-row items-center gap-4">
          {/* Text-based search */}
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search for products..."
            className="border p-2 rounded flex-1"
          />

          {/* Image-based search */}
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="border p-2 rounded"
          />

          <button
            onClick={handleSearch}
            className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            disabled={loading}
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      {!loading && products.length === 0 && !error && (
        <p className="text-gray-700">
          No products found. Try a different search term or upload an image.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
};

export default ProductList;
