import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

/**
 * GitHub Pages icin ozel Vite konfigurasyonu.
 * - base: repo adi ile eslesen URL prefix
 * - Manus'a ozgu plugin'ler dahil edilmez (CI ortaminda mevcut degil)
 * - Build ciktisi: dist/public klasoru
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: "/flood-hub-clone/",
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  define: {
    // API cagrilari build sirasinda sessizce basarisiz olacak
    // (GitHub Pages'te backend yok)
    'import.meta.env.VITE_API_URL': JSON.stringify(''),
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      // Buyuk chunk uyarilarini engelle
      onwarn(warning, warn) {
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return;
        warn(warning);
      },
    },
  },
});
