import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/app.css';
import App from './App';

// Tell Cesium where to load its static assets (workers, skybox textures, etc.)
// We use the CDN so no local file-copying is needed at build/deploy time.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).CESIUM_BASE_URL =
  'https://cdn.jsdelivr.net/npm/cesium@1.141.0/Build/Cesium/';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
