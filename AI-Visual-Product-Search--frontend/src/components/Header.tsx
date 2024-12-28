// src/components/Header.tsx

import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Search, Heart, LogOut } from 'lucide-react';
import { logout } from '../store/authSlice';
import { clearWishlist } from '../store/wishlistSlice';
import type { RootState } from '../store';

export default function Header() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const { items } = useSelector((state: RootState) => state.wishlist);

  const handleLogout = () => {
    dispatch(logout());
    dispatch(clearWishlist());
    navigate('/');
  };

  return (
    <header className="bg-white shadow-sm">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-2">
          <Search className="w-6 h-6 text-indigo-600" />
          <span className="font-bold text-xl truncate max-w-[200px] sm:max-w-full">
            Visual Search
          </span>
        </Link>

        <div className="flex items-center space-x-4">
          <Link
            to="/upload"
            className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
          >
            Search
          </Link>

          {isAuthenticated ? (
            <>
              <Link
                to="/wishlist"
                className="relative text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                <Heart className="w-5 h-5" />
                {items.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">
                    {items.length}
                  </span>
                )}
              </Link>
              <button
                onClick={handleLogout}
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700"
            >
              Login
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
