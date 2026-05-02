import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

const cesiumSource = 'node_modules/cesium/Build/Cesium';

// BASE_PATH is set by the GitHub Pages workflow to '/personal-site/'.
// Vercel/Netlify/local dev all use '/'.
const basePath = process.env.BASE_PATH ?? '/';

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    viteStaticCopy({
      targets: [
        { src: `${cesiumSource}/Workers`, dest: 'cesium' },
        { src: `${cesiumSource}/ThirdParty`, dest: 'cesium' },
        { src: `${cesiumSource}/Assets`, dest: 'cesium' },
        { src: `${cesiumSource}/Widgets`, dest: 'cesium' },
      ],
    }),
  ],
  define: {
    CESIUM_BASE_URL: JSON.stringify(`${basePath}cesium/`),
  },
  server: {
    port: 5173,
    host: true,
  },
});
