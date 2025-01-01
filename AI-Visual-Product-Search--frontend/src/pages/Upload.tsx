// src/pages/Upload.tsx

import { useState } from 'react';
import ImageDropzone from '../components/ImageDropzone';
import ProductCard from '../components/ProductCard';
import Loader from '../components/Loader';
import ErrorDisplay from '../components/ErrorDisplay';
import { useSearch } from '../context/SearchContext';
import { analyzeImage } from '../utils/api';

export default function Upload() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { searchResults, setSearchResults, searchImage, setSearchImage } =
    useSearch();

  const handleImageUpload = async (file: File) => {
    setIsAnalyzing(true);
    setError(null);

    try {
      // Preview the uploaded image
      const imageUrl = URL.createObjectURL(file);
      setSearchImage(imageUrl);

      // Analyze image without geolocation parameters
      const data = await analyzeImage(file);
      setSearchResults(data.products || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong. Please try again.'
      );
      setSearchResults([]);
      setSearchImage(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {!searchImage ? (
        <div className="max-w-3xl mx-auto mb-8">
          <ImageDropzone onImageUpload={handleImageUpload} />
        </div>
      ) : (
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <img
              src={searchImage}
              alt="Uploaded"
              className="w-24 h-24 object-cover rounded-lg"
            />
            <button
              onClick={() => {
                setSearchImage(null);
                setSearchResults([]);
              }}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Upload different image
            </button>
          </div>
        </div>
      )}

      {error && <ErrorDisplay error={error} onRetry={() => setSearchImage(null)} />}

      {isAnalyzing && <Loader message="Analyzing your image..." />}

      {searchResults.length > 0 && (
        <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mt-8">
          {searchResults.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
