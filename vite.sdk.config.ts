/**
 * vite.sdk.config.ts
 *
 * Secondary Vite build configuration — Gateway Global Web SDK
 *
 * Produces a single self-contained IIFE bundle:
 *   dist/public/sdk/v1/gateway.js
 *
 * Served at runtime as:
 *   https://aibizbot.gatewayglobal.ai/sdk/v1/gateway.js
 *
 * Client usage:
 *   <script
 *     src="https://aibizbot.gatewayglobal.ai/sdk/v1/gateway.js"
 *     data-site-id="SITE_CONFIG_UUID"
 *     defer
 *   ></script>
 *
 * Key design decisions:
 *  - IIFE format:  works on any website without a module bundler (Wix, WordPress, etc.)
 *  - No externals: React is bundled in — host sites don't need React loaded
 *  - CSS injection: vite-plugin-css-injected-by-js inlines all CSS into the JS bundle
 *                   so there's no separate .css file to load
 *  - emptyOutDir:false — avoids wiping sibling SDK version directories
 *  - __GATEWAY_PLATFORM_URL__ baked in at build time so the IIFE always knows
 *    which host to call regardless of the third-party domain it runs on
 *
 * Build command:
 *   doppler run -- npm run build:sdk
 */

import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';
import path from 'path';

export default defineConfig(({ mode }) => {
  // Load env so GEMINI_MODEL_ID (and optionally GATEWAY_PLATFORM_URL) can be
  // read from Doppler/environment at SDK build time.
  const env = loadEnv(mode, process.cwd(), '');

  // The platform URL is baked into the bundle at build time.
  // Override via GATEWAY_SDK_PLATFORM_URL env var for self-hosted deployments.
  const platformUrl =
    env.GATEWAY_SDK_PLATFORM_URL ||
    'https://aibizbot.gatewayglobal.ai';

  return {
    plugins: [
      react(),
      // Inlines all CSS into the JS bundle — no separate .css file for embedders to manage.
      cssInjectedByJsPlugin(),
    ],

    resolve: {
      alias: {
        // Mirror the aliases from the main vite.config.ts (minus @assets — not needed in SDK).
        '@': path.resolve(import.meta.dirname, 'client', 'src'),
        '@shared': path.resolve(import.meta.dirname, 'shared'),
      },
    },

    // The SDK entry is in client/src/sdk/, but Vite's `root` below is the repo root
    // so that the lib entry path resolves correctly.
    root: process.cwd(),

    define: {
      // Baked-in platform URL — the SDK will always call home here.
      __GATEWAY_PLATFORM_URL__: JSON.stringify(platformUrl),

      // Required so React (and bundled deps) run in production mode inside the IIFE.
      'process.env.NODE_ENV': JSON.stringify('production'),

      // Gemini model ID — same rule as the main app (never hardcode, read from env).
      'process.env.GEMINI_MODEL_ID': JSON.stringify(
        env.GEMINI_MODEL_ID || 'models/gemini-2.5-flash-native-audio-preview-12-2025'
      ),
    },

    build: {
      lib: {
        // The self-initializing entry point — reads data-site-id and auto-mounts React.
        entry: path.resolve(import.meta.dirname, 'client/src/sdk/index.tsx'),

        // IIFE global name (not directly exposed but required by Rollup lib mode).
        name: 'GatewayGlobalSDK',

        // Single output file regardless of format.
        fileName: () => 'gateway.js',

        // IIFE: works everywhere — no `import` or `require` needed on the host page.
        formats: ['iife'],
      },

      // Output alongside the main app so Express static middleware serves it automatically.
      outDir: path.resolve(import.meta.dirname, 'dist/public/sdk/v1'),

      // Do NOT wipe the directory — preserves future sdk/v2, sdk/v3, etc. alongside v1.
      emptyOutDir: false,

      rollupOptions: {
        // No externals — React, ReactDOM, and all deps must be bundled so the IIFE is
        // self-contained. Host pages (Wix, WordPress) won't have React available.
        external: [],

        output: {
          // Merge all dynamic imports into the single IIFE file.
          inlineDynamicImports: true,
        },
      },

      // Aggressive minification for a small over-the-wire footprint.
      minify: 'esbuild',

      // Omit sourcemaps from production SDK bundle.
      sourcemap: false,

      // Increase chunk warning threshold — the IIFE will be larger because React is bundled.
      chunkSizeWarningLimit: 800,
    },
  };
});
