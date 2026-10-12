/// <reference types="vitest/config" />
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const proxyTarget = env.API_PROXY || "http://127.0.0.1:3000";
  return {
    resolve: { alias: { "@web": fileURLToPath(new URL("./src", import.meta.url)) } },
    plugins: [react()],
    build: {
      outDir: mode === "demo" ? "dist-demo" : "dist",
      emptyOutDir: true,
      sourcemap: false,
      chunkSizeWarningLimit: 600,
    },
    server: {
      host: "127.0.0.1",
      port: 5173,
      proxy: {
        "/v1": { target: proxyTarget, changeOrigin: false },
        "/live": { target: proxyTarget, changeOrigin: false },
        "/ready": { target: proxyTarget, changeOrigin: false },
      },
    },
    preview: {
      host: "127.0.0.1",
      port: 4173,
      proxy: {
        "/v1": { target: proxyTarget, changeOrigin: false },
        "/live": { target: proxyTarget, changeOrigin: false },
        "/ready": { target: proxyTarget, changeOrigin: false },
      },
    },
    test: {
      environment: "jsdom",
      include: [
        "src/**/*.test.ts",
        "src/**/*.test.tsx",
        "src/**/__tests__/*.unit.spec.ts",
        "src/**/__tests__/*.unit.spec.tsx",
      ],
    },
  };
});
