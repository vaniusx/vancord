import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import process from "node:process";
import pkg from "./package.json" with { type: "json" };

const host = process.env.TAURI_DEV_HOST;

// Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
export default defineConfig(() => ({
  plugins: [react(), tailwindcss()],

  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },

  build: {
    // The Tauri webview on Windows, Android and iOS is evergreen, so there is no
    // need to down-compile anything.
    target: "esnext",
    cssMinify: true,
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        // Splitting the heavy, independently-cacheable dependencies keeps the
        // entry chunk small and lets a UI-only change avoid re-downloading
        // Supabase, LiveKit or the icon set.
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("livekit")) return "livekit";
          if (id.includes("@supabase")) return "supabase";
          if (id.includes("emoji-mart")) return "emoji";
          if (id.includes("marked") || id.includes("dompurify")) return "markdown";
          if (id.includes("@radix-ui") || id.includes("radix-ui")) return "radix";
          if (id.includes("lucide-react")) return "icons";
          if (
            id.includes("react-dom") ||
            id.includes("react-router") ||
            id.includes("scheduler") ||
            id.includes("react/")
          ) {
            return "react";
          }
          return undefined;
        },
      },
    },
  },

  // Single source of truth for the version shown in the UI and used by the
  // updater guard: package.json.
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },

  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
}));
