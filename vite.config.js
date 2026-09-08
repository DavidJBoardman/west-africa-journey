import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/west-africa-journey/',
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Leaflet and React are the bulk of the bundle and never change between
        // deploys, so keeping them in their own chunks lets them stay cached
        // across releases while the app chunk churns. Vite 8's rolldown
        // backend takes manualChunks only as a function.
        manualChunks(id) {
          if (!id.includes('node_modules')) return null;
          if (/[\\/]node_modules[\\/](leaflet|react-leaflet|@react-leaflet)[\\/]/.test(id)) return 'leaflet';
          if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return 'react';
          return null;
        },
      },
    },
  },
})
