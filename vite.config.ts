import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const SITE_DESCRIPTION =
  'Interactive world map of cities with an active BitDevs group: Socratic seminars where developers discuss changes to the Bitcoin protocol.'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        id: '/',
        name: 'BitDevs Map',
        short_name: 'BitDevs Map',
        description: SITE_DESCRIPTION,
        lang: 'en',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        // Matches --color-ink-950, the page background, so the splash screen
        // and the status bar do not flash a lighter color on launch.
        background_color: '#060607',
        theme_color: '#060607',
        categories: ['education', 'social'],
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png}'],
        // The social card is only ever fetched by crawlers, never by the app.
        globIgnores: ['**/og-image.png'],
        // The bundle carries the world-atlas topology, well past the 2 MiB default.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            // Git-scraped topics and events: serve the cached copy immediately
            // and refresh it in the background. Offline, the app still falls
            // back to the snapshots bundled in src/data.
            urlPattern:
              /^https:\/\/raw\.githubusercontent\.com\/KyraLabs\/bitdevsmap\/data\/.*\.json$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'bitdevs-data',
              expiration: { maxEntries: 8, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\//,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets',
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 16, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
})
