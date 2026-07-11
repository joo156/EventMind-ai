import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [
    // TanStack Start plugin (must be first — handles SSR, server functions, routing)
    tanstackStart({
      // Point to our custom SSR error-wrapper entry
      server: { entry: "src/server.ts" },
    }),
    // React Refresh (required for dev mode by tanstackStart)
    react({
      babel: {
        compact: false,
      },
    }),
    // Tailwind CSS
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 8080,
    host: "localhost",
    strictPort: false,
  },
});
