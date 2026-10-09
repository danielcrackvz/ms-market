import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Si publicas en GitHub Pages en https://tuusuario.github.io/ms-market/
// deja base: "/ms-market/". Si usas Firebase Hosting, deja base: "/".
export default defineConfig({
  plugins: [react()],
  base: "/ms-market/",
});
