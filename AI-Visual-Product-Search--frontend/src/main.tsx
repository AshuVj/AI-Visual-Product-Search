import './index.css';
import React from 'react';
import ReactDOM from 'react-dom/client'; // Import from 'react-dom/client'
import App from './App';
import { store, persistor } from './store';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Select the root element
const container = document.getElementById('root');

if (!container) {
  throw new Error("Failed to find the root element. Make sure there's an element with id 'root' in your HTML.");
}

// Create a root.
const root = ReactDOM.createRoot(container);

// Render the application
root.render(
  <React.StrictMode>
    <Provider store={store}>
      {/* PersistGate delays the rendering until persisted state is loaded */}
      <PersistGate loading={<div>Loading...</div>} persistor={persistor}>
        <App />
        <ToastContainer />
      </PersistGate>
    </Provider>
  </React.StrictMode>
);
