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
          // Manual registration to control when SW loads
          injectRegister: false,
          registerType: "prompt",

          // Development options
          devOptions: {
            enabled: false, // Disable in development
            type: "module",
          },

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
            background_color: "#ffffff",
            display: "standalone",
            orientation: "portrait",
            start_url: "/",
            scope: "/",
            categories: ["education", "productivity"],
            shortcuts: [
              {
                name: "Dashboard",
                short_name: "Dashboard",
                description: "Go to Dashboard",
                url: "/",
                icons: [
                  {
                    src: "pwa-192x192.png",
                    sizes: "192x192",
                    type: "image/png",
                  },
                ],
              },
            ],
            icons: [
              {
                src: "pwa-64x64.png",
                sizes: "64x64",
                type: "image/png",
              },
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
            swSrc: 'public/custom-sw.js', // Add this line
            skipWaiting: false, // Don't skip waiting - let user control
            clientsClaim: false, // Don't claim clients immediately
            
            // Cache patterns
            globPatterns: [
              "**/*.{js,css,html,ico,png,svg,jpg,jpeg,gif,webp,woff,woff2,ttf,eot,json}",
            ],
            
            // IMPORTANT: Don't cache navigation (HTML) at all
            navigateFallback: null,
            
            // Runtime caching with careful strategies
            runtimeCaching: [
              // 1. DON'T CACHE AUTH API CALLS - use NetworkOnly
              {
                urlPattern: /^https:\/\/[a-z0-9-]+\.supabase\.co\/auth\/.*/i,
                handler: "NetworkOnly",
              },
              {
                urlPattern: /^https:\/\/[a-z0-9-]+\.supabase\.co\/rest\/v1\/.*/i,
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
              // 2. DON'T CACHE HTML PAGES - use NetworkOnly
              {
                urlPattern: ({ request }) => request.mode === "navigate",
                handler: "NetworkOnly",
              },
              // 3. Cache static assets
              {
                urlPattern: /\.(?:js|css|woff2|woff|ttf|eot|ico)$/,
                handler: "CacheFirst",
                options: {
                  cacheName: "static-resources",
                  expiration: {
                    maxEntries: 100,
                    maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                  },
                },
              },
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
              // 4. Cache fonts
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
            ],
          },

          // Self-destroying service worker on auth errors
          selfDestroying: true,
        }),
    ].filter(Boolean),

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
