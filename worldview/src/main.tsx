import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/app.css';
import App from './App';

// Cesium reads a global to find its static assets. vite.config.ts also defines
// CESIUM_BASE_URL but we set window-level for code paths that read at runtime.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).CESIUM_BASE_URL = `${import.meta.env.BASE_URL}cesium/`;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
