import { Heart, Trash2 } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import {
  addToWishlist as addToWishlistAction,
  removeFromWishlist as removeFromWishlistAction,
} from '../store/wishlistSlice';
import {
  addToWishlist as addToWishlistApi,
  removeFromWishlist as removeFromWishlistApi,
} from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import type { Product } from '../types';
import type { RootState } from '../store';
import { toast } from 'react-toastify';
import { useState } from 'react';

interface ProductCardProps {
  product: Product;
  isWishlist?: boolean;
  onRemove?: (productId: string) => Promise<void>; // Make it return Promise for proper handling
}

export default function ProductCard({
  product,
  isWishlist = false,
  onRemove,
}: ProductCardProps) {
  const dispatch = useDispatch();
  const { requireAuth } = useAuth();
  const wishlistItems = useSelector((state: RootState) => state.wishlist.items);
  const isInWishlist = wishlistItems.some((item) => item.id === product.id);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleWishlistAction = () => {
    requireAuth(async () => {
      if (isWishlist && onRemove) {
        // Delegate removal to the parent component
        setIsLoading(true);
        setError('');
        try {
          await onRemove(product.id);
          // Assuming onRemove handles dispatch and toasts
        } catch (error) {
          console.error('Failed to remove from wishlist:', error);
          toast.error('Failed to remove item from wishlist');
        } finally {
          setIsLoading(false);
        }
        return;
      }

      // Handle add/remove from wishlist
      setError('');
      setIsLoading(true);

      try {
        if (isInWishlist) {
          await removeFromWishlistApi(product.id);
          dispatch(removeFromWishlistAction(product.id));
          toast.success('Item removed from wishlist');
        } else {
          await addToWishlistApi(product);
          dispatch(addToWishlistAction(product));
          toast.success('Item added to wishlist');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update wishlist.');
        toast.error(err instanceof Error ? err.message : 'Failed to update wishlist.');
      } finally {
        setIsLoading(false);
      }
    });
  };

  // Define a mapping from currency codes to symbols
  const currencySymbols: { [key: string]: string } = {
    'USD': '$',
    'INR': '₹',
    'EUR': '€',
    'GBP': '£',
    'CAD': 'C$',
    'AUD': 'A$',
    // Add more as needed
  };

  // Format the price based on currency
  const formatPrice = () => {
    if (product.price && product.price > 0 && product.currency) {
      const currencySymbol = currencySymbols[product.currency] || '$'; // Default to '$' if currency not mapped
      return `${currencySymbol}${product.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return 'Price not available';
  };

  // Ensure sourceLink has protocol
  const getSourceLink = () => {
    if (product.sourceLink.startsWith('http://') || product.sourceLink.startsWith('https://')) {
      return product.sourceLink;
    }
    return `https://${product.sourceLink}`;
  };

  return (
    <div className="product-card bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transform hover:scale-105 transition-transform">
      <img
        src={product.imageUrl} // Ensure consistent naming between frontend and backend
        alt={product.title}
        className="w-full h-40 object-cover"
        loading="lazy" // Improves performance by lazy loading images
      />
      <div className="p-4">
        <h3 className="text-base font-semibold text-gray-900 mb-2 truncate">
          {product.title}
        </h3>
        <div className="flex justify-between items-center">
          <div className="text-sm">
            <a
              href={getSourceLink()} // Updated to ensure full URL
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline mb-1 block"
            >
              Link {/* Changed from platform name to 'Link' */}
            </a>
            <p className="text-indigo-600 font-bold">
              {formatPrice()}
            </p>
          </div>
          <button
            onClick={handleWishlistAction}
            disabled={isLoading}
            className={`p-2 rounded-full ${
              isWishlist || isInWishlist
                ? 'bg-red-100 text-red-600 hover:bg-red-200'
                : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'
            } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            aria-label={isWishlist || isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            {isWishlist || isInWishlist ? (
              <Trash2 className="w-5 h-5" />
            ) : (
              <Heart className="w-5 h-5" />
            )}
          </button>
        </div>
        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
      </div>
    </div>
  );
}
