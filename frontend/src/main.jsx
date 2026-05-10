import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';
import { PartnerProvider } from './context/PartnerContext';

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
      <PartnerProvider>
        <App />
      </PartnerProvider>
    </React.StrictMode>
  );
}