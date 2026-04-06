// frontend/src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// ============================================
// BOOTSTRAP CORE
// ============================================
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

// ============================================
// TEMPLATE CSS
// ============================================
import './assets/css/template/bootstrap.min.css';
import './assets/css/template/bootstrap-grid.min.css';
import './assets/css/template/bootstrap-reboot.min.css';
import './assets/css/template/estilo.css';

// ============================================
// FONT AWESOME
// ============================================
import '@fortawesome/fontawesome-free/css/all.min.css';

// ============================================
// CUSTOM STYLES
// ============================================
import './styles/index.css'; // ← removed: import { Browser } from 'leaflet' (unused, caused error)

ReactDOM.createRoot(document.getElementById('root')).render(
      <App />
);