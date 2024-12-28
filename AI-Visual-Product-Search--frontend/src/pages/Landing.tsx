// src/pages/Landing.tsx

import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';

export default function Landing() {
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  const handleStartSearching = () => {
    if (isAuthenticated) {
      navigate('/upload');
    } else {
      navigate('/login', { state: { from: '/upload' } });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20">
        <div className="text-center">
          <Search className="w-16 h-16 text-white mx-auto mb-6" />
          <h1 className="text-4xl tracking-tight font-extrabold text-white sm:text-5xl md:text-6xl">
            Search for anything
            <span className="block text-indigo-200">with just an image</span>
          </h1>
          <p className="mt-3 max-w-md mx-auto text-base text-indigo-100 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            Upload a photo and discover where to buy similar products. Save your favorites to your wishlist.
          </p>
          <div className="mt-10">
            <button 
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-indigo-700 bg-white hover:bg-indigo-50 md:py-4 md:text-lg md:px-10"
              onClick={handleStartSearching}
            >
              Start Searching
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
