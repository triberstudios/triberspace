import { defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig(({ command }) => ({
  plugins: [
    // Only copy static assets during build, not during dev
    ...(command === 'build' ? [
      viteStaticCopy({
        targets: [
          {
            src: 'js',
            dest: '.'
          },
          {
            src: 'css',
            dest: '.'
          },
          {
            src: 'images',
            dest: '.'
          },
          {
            src: 'auth',
            dest: '.'
          }
        ]
      })
    ] : [])
  ],
  // Development server configuration
  server: {
    port: 3003,
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

  // Let Vite serve static files in dev mode normally
  publicDir: 'public',

  // Module resolution - let Vite handle standard Node resolution
  resolve: {
    alias: {
      'three/addons/': 'three/examples/jsm/',
      'three/examples/': 'three/examples/',
      // Force Rete.js to use our React instance instead of its bundled one
      'react': 'react',
      'react-dom': 'react-dom'
    }
  },

  // Optimization for Three.js and dependencies
  optimizeDeps: {
    include: ['three', '@breezystack/lamejs', '@zip.js/zip.js', 'three-gpu-pathtracer'],
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
}))