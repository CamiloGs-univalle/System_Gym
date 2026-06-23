import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  
  plugins: [react({
      // Esto permite JSX en archivos .js
      include: "**/*.{jsx,js}",
    })],
  server: {
    port: 5173,
    strictPort: true
  }
});