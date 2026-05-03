import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Cesium static assets (workers, textures, skybox, etc.) are served from the
// jsDelivr CDN matching the exact installed version. This avoids copying
// hundreds of files during build and eliminates GH Pages asset 404s entirely.
const cesiumVersion = '1.141.0';
const CESIUM_BASE_URL = `https://cdn.jsdelivr.net/npm/cesium@${cesiumVersion}/Build/Cesium/`;

// BASE_PATH is set by the GitHub Pages workflow to '/personal-site/'.
// Vercel/Netlify/local dev all use '/'.
const basePath = process.env.BASE_PATH ?? '/';

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
  ],
  define: {
    CESIUM_BASE_URL: JSON.stringify(CESIUM_BASE_URL),
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      // Forward /api/flights to adsb.lol server-side → no CORS in local dev.
      '/api/flights': {
        target: 'https://api.adsb.lol',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/flights/, '/v2/aircraft'),
      },
    },
  },
});
