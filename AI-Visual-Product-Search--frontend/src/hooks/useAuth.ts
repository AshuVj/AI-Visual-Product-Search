import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import type { RootState } from '../store';
import { useEffect } from 'react';
import { refreshAccessToken } from '../utils/api';
import { setCredentials, logout } from '../store/authSlice';
import { clearAuthData } from '../utils/storage';
import { toast } from 'react-toastify';
import { User } from '../types';

export function useAuth() {
  const { isAuthenticated, token, user } = useSelector((state: RootState) => state.auth);
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  useEffect(() => {
    const interval = setInterval(async () => {
      if (isAuthenticated && token) {
        try {
          const data = await refreshAccessToken();
          // Assuming the backend returns the user info upon token refresh
          // If not, you might need to fetch user info separately
          const updatedUser: User | null = user; // Replace with actual user data if available

          // Update access token in localStorage and Redux store
          localStorage.setItem('token', data.access_token);
          dispatch(setCredentials({ user: updatedUser, token: data.access_token }));
          console.log('Access token refreshed');
        } catch (error) {
          console.error('Failed to refresh access token:', error);
          dispatch(logout());
          clearAuthData();
          navigate('/login', { state: { from: location.pathname } });
          toast.error('Session expired. Please log in again.');
        }
      }
    }, 30 * 60 * 1000); // Refresh every 30 minutes

    return () => clearInterval(interval);
  }, [isAuthenticated, token, user, navigate, location.pathname, dispatch]);

  const requireAuth = (callback: () => void) => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location.pathname } });
      return;
    }
    callback();
  };

  return {
    isAuthenticated,
    requireAuth
  };
}