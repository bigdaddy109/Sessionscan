import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  publicDir: "public",
  server: { host: "127.0.0.1", port: 43173, strictPort: true },
  preview: { host: "127.0.0.1", port: 43173, strictPort: true },
  build: { outDir: "dist", emptyOutDir: true },
});
