import { defineConfig } from 'vite'

export default defineConfig({
  // Development server configuration
  server: {
    port: 3001,
    host: true, // Allow external connections
    open: true  // Auto-open browser
  },

  // Build configuration
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: './index.html'
      }
    }
  },

  // Asset handling
  publicDir: 'public',

  // Module resolution - let Vite handle standard Node resolution
  resolve: {
    alias: {
      'three/addons/': 'three/examples/jsm/',
      'three/examples/': 'three/examples/'
    }
  },

  // Optimization for Three.js
  optimizeDeps: {
    include: ['three'],
    exclude: ['three/addons/', 'three/examples/']
  },

  // Base path for deployment
  base: './',

  // Environment variables
  envPrefix: 'VITE_',

  // Define global constants
  define: {
    // Add any global defines if needed
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0')
  }
})