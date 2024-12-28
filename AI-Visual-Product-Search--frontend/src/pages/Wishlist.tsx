import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Heart } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import { getWishlist, removeFromWishlist as removeFromWishlistApi } from '../utils/api';
import { setWishlist, removeFromWishlist } from '../store/wishlistSlice';
import type { RootState } from '../store';
import type { Product } from '../types';
import { toast } from 'react-toastify';

export default function Wishlist() {
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const wishlistItems = useSelector((state: RootState) => state.wishlist.items);
  const [isLoading, setIsLoading] = React.useState<boolean>(true); // Local state for loading

  const handleRemoveItem = async (productId: string) => {
    try {
      await removeFromWishlistApi(productId);
      dispatch(removeFromWishlist(productId));
      toast.success('Item removed from wishlist');
    } catch (error) {
      console.error('Failed to remove from wishlist:', error);
      toast.error('Failed to remove item from wishlist');
    }
  };

  useEffect(() => {
    const fetchWishlist = async () => {
      try {
        const response = await getWishlist();
        console.log('Fetched wishlist:', response.wishlist); // Debugging line
        dispatch(setWishlist(response.wishlist || []));
      } catch (error) {
        console.error('Error fetching wishlist:', error);
        toast.error('Failed to load wishlist');
      } finally {
        setIsLoading(false);
      }
    };
  
    if (isAuthenticated) {
      fetchWishlist();
    } else {
      // Optionally, clear the wishlist if not authenticated
      dispatch(setWishlist([]));
      setIsLoading(false);
    }
  }, [dispatch, isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center">
        <Heart className="w-16 h-16 text-gray-300 mb-4" />
        <h2 className="text-2xl font-semibold text-gray-900">Please Log In</h2>
        <p className="mt-2 text-gray-600">Log in to view and manage your wishlist.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (wishlistItems.length === 0) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center">
        <Heart className="w-16 h-16 text-gray-300 mb-4" />
        <h2 className="text-2xl font-semibold text-gray-900">Your Wishlist is Empty</h2>
        <p className="mt-2 text-gray-600">Start adding products to create your collection.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">My Wishlist</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {wishlistItems.map((product: Product) => (
          <ProductCard 
            key={product.id} 
            product={product} 
            isWishlist 
            onRemove={handleRemoveItem}
          />
        ))}
      </div>
    </div>
  );
}
