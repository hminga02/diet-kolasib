import { defineConfig } from "vite";
import dyadComponentTagger from "@dyad-sh/react-vite-component-tagger";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(() => {
  return {
    server: {
      host: "::",
      port: 8080,
    },

    plugins: [
      dyadComponentTagger(),
      react(),
      // NO PWA PLUGIN - completely disabled
    ],

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    
    // Prevent any service worker generation
    build: {
      rollupOptions: {
        output: {
          // Remove any service worker references
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]'
        }
      }
    }
  };
});
