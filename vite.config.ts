import { defineConfig } from "vite";
import dyadComponentTagger from "@dyad-sh/react-vite-component-tagger";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
  return {
    server: {
      host: "::",
      port: 8080,
    },

    plugins: [
      dyadComponentTagger(),
      react(),

      mode === "production" &&
        VitePWA({
          injectRegister: null,
          registerType: "autoUpdate",

          includeAssets: [
            "favicon.ico",
            "apple-touch-icon.png",
            "masked-icon.svg",
          ],

          manifest: {
            name: "DIET KOLASIB",
            short_name: "DIET KOLASIB",
            description: "Educational Management System for DIET Kolasib",
            theme_color: "#1E40AF",
            display: "standalone",
            icons: [
              {
                src: "pwa-192x192.png",
                sizes: "192x192",
                type: "image/png",
              },
              {
                src: "pwa-512x512.png",
                sizes: "512x512",
                type: "image/png",
              },
              {
                src: "pwa-512x512.maskable.png",
                sizes: "512x512",
                type: "image/png",
                purpose: "maskable",
              },
            ],
          },

          workbox: {
            cleanupOutdatedCaches: true,
            skipWaiting: true,
            clientsClaim: true,

            globPatterns: [],

            // Fix: Don't cache HTML for authenticated apps
            navigateFallback: null,
            navigateFallbackAllowlist: [],
            navigateFallbackDenylist: [/^\/.*/], // Deny all - don't cache any HTML

            runtimeCaching: [
              // For authentication endpoints, use NetworkFirst with short cache
              {
                urlPattern: /^https:\/\/[a-z0-9-]+\.supabase\.co\/auth\/.*/i,
                handler: "NetworkFirst",
                options: {
                  cacheName: "supabase-auth-cache",
                  expiration: {
                    maxEntries: 1,
                    maxAgeSeconds: 300, // 5 minutes max for auth data
                  },
                  networkTimeoutSeconds: 10,
                },
              },
              // For other Supabase API calls, use NetworkFirst for data consistency
              {
                urlPattern: /^https:\/\/[a-z0-9-]+\.supabase\.co\/.*/i,
                handler: "NetworkFirst",
                options: {
                  cacheName: "supabase-api-cache",
                  expiration: {
                    maxEntries: 100,
                    maxAgeSeconds: 5 * 60, // 5 minutes for API data
                  },
                  networkTimeoutSeconds: 5,
                },
              },
              // For navigation requests (HTML pages), use NetworkOnly to avoid caching auth state
              // NetworkOnly doesn't support networkTimeoutSeconds, so we handle timeout differently
              {
                urlPattern: ({ request }) => request.mode === "navigate",
                handler: "NetworkOnly",
                // Remove options object since NetworkOnly doesn't support networkTimeoutSeconds
              },
              // Cache static assets with CacheFirst strategy
              {
                urlPattern: /\.(?:js|css|woff2|woff|ttf|eot|ico|svg|png|jpg|jpeg|gif)$/,
                handler: "CacheFirst",
                options: {
                  cacheName: "static-assets",
                  expiration: {
                    maxEntries: 100,
                    maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
                  },
                },
              },
              // Cache fonts
              {
                urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
                handler: "CacheFirst",
                options: {
                  cacheName: "google-fonts",
                  expiration: {
                    maxEntries: 10,
                    maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                  },
                },
              },
              // Handle images with CacheFirst
              {
                urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
                handler: "CacheFirst",
                options: {
                  cacheName: "images",
                  expiration: {
                    maxEntries: 200,
                    maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
                  },
                },
              },
            ],
          },

          // Additional PWA configuration to handle auth state
          devOptions: {
            enabled: mode === "development",
            type: "module",
            navigateFallback: "index.html",
          },
        }),
    ].filter(Boolean),

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },

    // Clear build cache to avoid stale service worker issues
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ["react", "react-dom", "react-router-dom"],
            auth: ["@supabase/supabase-js"],
          },
        },
      },
    },
  };
});
