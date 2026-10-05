import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

// Custom plugin to automatically delete unwanted Vite boilerplate
const cleanShopifyAssets = () => ({
  name: 'clean-shopify-assets',
  closeBundle: () => {
    const outDir = '../cel-revive-ai-skin-assessment/extensions/ai-skin-assessment/assets';
    const filesToRemove = ['index.html', 'icons.svg', 'favicon.svg'];
    
    filesToRemove.forEach(file => {
      const filePath = path.resolve(outDir, file);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });
  }
});

// https://vite.dev/config/
export default defineConfig({
  // Add the custom plugin right after React
  plugins: [react(), cleanShopifyAssets()],
  
  build: {
    outDir: '../cel-revive-ai-skin-assessment/extensions/ai-skin-assessment/assets',
    emptyOutDir: true,
    
    rollupOptions: {
      output: {
        entryFileNames: 'main.js',
        chunkFileNames: '[name].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith('.css')) {
            return 'main.css';
          }
          return '[name].[ext]';
        },
      },
    },
  },
});