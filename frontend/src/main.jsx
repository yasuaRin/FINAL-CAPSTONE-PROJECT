// frontend/src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';
import { PartnerProvider } from './contexts/PartnerContext';
import { AuthProvider } from './contexts/AuthContext'; // Make sure this exists

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <PartnerProvider>
        <App />
      </PartnerProvider>
    </AuthProvider>
  </React.StrictMode>
);