export default {
  // Development server configuration
  server: {
    port: 3001,
    host: true, // Allow access from network
    open: false // Don't auto-open browser
  },
  
  // Build configuration
  build: {
    target: 'esnext', // Support for import maps and modern features
    outDir: 'dist',
    rollupOptions: {
      input: 'index.html'
    }
  },
  
  // Preview server configuration (for production builds)
  preview: {
    port: 3001,
    host: true
  },
  
  // Enable source maps for better debugging
  css: {
    devSourcemap: true
  },
  
  // Tell Vite to skip import analysis for CDN modules
  optimizeDeps: {
    exclude: [
      'three',
      'three-gpu-pathtracer',
      'three-mesh-bvh'
    ]
  },
  
  // Simple plugin to suppress import analysis warnings for CDN imports
  plugins: [{
    name: 'suppress-cdn-warnings',
    configureServer(server) {
      const originalWarn = console.warn;
      console.warn = (...args) => {
        const message = args.join(' ');
        // Suppress specific Vite warnings for CDN imports
        if (message.includes('Failed to resolve import') && 
            (message.includes('three/addons') || message.includes('three-gpu-pathtracer'))) {
          return;
        }
        originalWarn(...args);
      };
    }
  }]
};