import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Las cifras salen de ./resultados: copia exacta de lo que exporta el notebook
// (se actualiza con `npm run sincronizar` si el notebook se vuelve a correr).
const resultados = path.resolve(__dirname, "resultados");

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@resultados": resultados,
    },
  },
  server: {
    fs: { allow: [__dirname, resultados] },
  },
});
