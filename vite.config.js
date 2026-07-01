import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import fs from 'fs'

// Custom plugin to copy manifest.json and icon to dist
const chromeExtensionPlugin = () => {
  return {
    name: 'chrome-extension-plugin',
    closeBundle() {
      // Ensure dist exists
      const distDir = resolve(__dirname, 'dist');
      if (!fs.existsSync(distDir)) {
        fs.mkdirSync(distDir, { recursive: true });
      }
      
      // Copy manifest
      const manifestSrc = resolve(__dirname, 'manifest.json');
      const manifestDest = resolve(__dirname, 'dist/manifest.json');
      if (fs.existsSync(manifestSrc)) {
        fs.copyFileSync(manifestSrc, manifestDest);
        console.log('manifest.json copied successfully to dist/');
      }

      // Copy public/icon.png if Vite didn't copy it
      const iconSrc = resolve(__dirname, 'public/icon.png');
      const iconDest = resolve(__dirname, 'dist/icon.png');
      if (fs.existsSync(iconSrc)) {
        fs.copyFileSync(iconSrc, iconDest);
        console.log('icon.png copied successfully to dist/');
      }
    }
  }
}

export default defineConfig({
  plugins: [react(), chromeExtensionPlugin()],
  build: {
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'index.html'),
        options: resolve(__dirname, 'options.html'),
        background: resolve(__dirname, 'src/background/index.js'),
        content: resolve(__dirname, 'src/content/index.js'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'background' || chunkInfo.name === 'content') {
            return '[name].js';
          }
          return 'assets/[name]-[hash].js';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      }
    }
  }
})
