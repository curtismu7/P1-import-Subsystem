import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  // Set the root to where your HTML file is located
  root: 'public',
  
  // Build configuration
  build: {
    // Output directory (relative to root)
    outDir: '../dist',
    emptyOutDir: true,
    
    // Generate source maps for debugging
    sourcemap: true,
    
    // Rollup options for advanced configuration
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'public/index.html'),
        'test-settings': path.resolve(__dirname, 'public/test-settings.html')
      },
      output: {
        // Organize build assets
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
      }
    },
    
    // Target modern browsers for better performance
    target: 'es2020',
    
    // Minification options
    minify: 'esbuild',
    
    // Asset size limit before warning (in KB)
    chunkSizeWarningLimit: 1000
  },
  
  // Development server configuration
  server: {
    port: 5173,
    host: true, // Listen on all local IPs
    open: false, // Don't auto-open browser
    
    // Proxy API requests to your Express server
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        secure: false
      },
      '/socket.io': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        ws: true // Enable WebSocket proxying
      }
    },
    
    // CORS configuration
    cors: true,
    
    // Hot Module Replacement
    hmr: {
      overlay: true
    }
  },
  
  // Preview server (for testing production builds)
  preview: {
    port: 4173,
    host: true
  },
  
  // Module resolution
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@client': path.resolve(__dirname, 'src/client'),
      '@public': path.resolve(__dirname, 'public'),
      '@components': path.resolve(__dirname, 'src/client/components'),
      '@subsystems': path.resolve(__dirname, 'src/client/subsystems'),
      '@utils': path.resolve(__dirname, 'src/client/utils'),
      '@modules': path.resolve(__dirname, 'public/js/modules')
    },
    
    // File extensions to resolve
    extensions: ['.js', '.ts', '.json', '.html', '.css']
  },
  
  // CSS configuration
  css: {
    devSourcemap: true,
    preprocessorOptions: {
      // Add any CSS preprocessor options here if needed
    }
  },
  
  // Optimizations
  optimizeDeps: {
    include: [
      // Pre-bundle these dependencies for faster dev startup
      'socket.io-client'
    ],
    exclude: [
      // Don't pre-bundle these
    ]
  },
  
  // Environment variables
  envPrefix: 'VITE_',
  
  // Plugin configuration (for future use)
  plugins: [
    // Add plugins here as needed
    // For example: react(), vue(), etc.
  ],
  
  // Define global constants
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString())
  },
  
  // Log level
  logLevel: 'info',
  
  // Clear screen on startup
  clearScreen: false
});