import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      include: ['buffer', 'process', 'stream', 'events', 'util', 'inherits'],
      globals: { Buffer: true, global: true, process: true },
    }),
  ],
  resolve: {
    alias: {
      'simple-peer': 'simple-peer/simplepeer.min.js',
    },
  },
  optimizeDeps: {
    include: ['pdfjs-dist'],
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-socket': ['socket.io-client'],
          'vendor-motion': ['framer-motion'],
          'vendor-pdf': ['pdfjs-dist'],
        },
      },
    },
  },
});
