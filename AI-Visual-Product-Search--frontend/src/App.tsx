// src/App.tsx

import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Provider, useDispatch } from 'react-redux';
import { store } from './store';
import { SearchProvider } from './context/SearchContext';
import { setGeolocation } from './store/GeolocationSlice';
import { useGeolocation } from './hooks/useGeolocation';

import Header from './components/Header';
import ProductList from './components/ProductList';
import Landing from './pages/Landing';
import Upload from './pages/Upload';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Wishlist from './pages/Wishlist';
import ProtectedRoute from './components/ProtectedRoute';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function AppContent() {
  const dispatch = useDispatch();
  const { countryCode, currency } = useGeolocation();

  useEffect(() => {
    if (countryCode && currency) {
      dispatch(setGeolocation({ countryCode, currency }));
    }
  }, [countryCode, currency, dispatch]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route
            path="/upload"
            element={
              <ProtectedRoute>
                <Upload />
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/wishlist"
            element={
              <ProtectedRoute>
                <Wishlist />
              </ProtectedRoute>
            }
          />
          {/* Example route for product list */}
          <Route path="/products" element={<ProductList />} />
        </Routes>
      </main>
      <ToastContainer />
    </div>
  );
}

function App() {
  return (
    <Provider store={store}>
      <SearchProvider>
        <Router>
          <AppContent />
        </Router>
      </SearchProvider>
    </Provider>
  );
}

export default App;
