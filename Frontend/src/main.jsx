// Entry point: load styles + i18n, then mount <App /> into index.html's #root.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './features/shared/i18n/i18n'; // runs i18next.init() once
import App from './App';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);