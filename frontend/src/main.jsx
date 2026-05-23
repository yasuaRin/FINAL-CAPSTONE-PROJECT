import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';
import { PartnerProvider } from './contexts/PartnerContext';
import { AuthProvider } from './contexts/AuthContext';

console.log('INIT URL:', window.location.href);
console.log('INIT HASH:', window.location.hash); 
const href = window.location.href;
const codeMatch = href.match(/[?&]code=([^&#]+)/);
if (codeMatch) {
  sessionStorage.setItem('reset_code', codeMatch[1]);
  window.location.replace(
    window.location.origin + '/#/admin/auth/reset-password'
  );
} else {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <AuthProvider>
        <PartnerProvider>
          <App />
        </PartnerProvider>
      </AuthProvider>
    </React.StrictMode>
  );
}