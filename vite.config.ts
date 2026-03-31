import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig(async ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "client", "src", "assets"),
      "@os-core": path.resolve(import.meta.dirname, "os-core", "src"),
      "@gateway/design-tokens": path.resolve(
        import.meta.dirname,
        "packages/design-tokens/src/index.ts",
      ),
      "@gateway/canvas-sdk": path.resolve(
        import.meta.dirname,
        "packages/canvas-sdk/src/index.ts",
      ),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  define: {
    "process.env.GEMINI_MODEL_ID": JSON.stringify(
      env.GEMINI_MODEL_ID || "models/gemini-2.5-flash-native-audio-preview-12-2025"
    ),
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    hmr: {
      protocol: "ws", // Force non-secure WebSocket
      host: "localhost", // Force it to connect locally, ignoring the public domain
      clientPort: 5173,
    },
    fs: {
      strict: true,
      deny: ["**/.*"],
      allow: [".."],
    },
    // When running Vite standalone (e.g. client-only dev), proxy /api to backend
    proxy: process.env.VITE_API_PROXY !== "false" ? {
      "/api": {
        target: process.env.API_BASE || process.env.VITE_API_TARGET || "http://localhost:5000",
        changeOrigin: true,
      },
    } : undefined,
  },
};
});
