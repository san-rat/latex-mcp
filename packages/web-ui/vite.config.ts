import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/pdfjs-dist/")) return "pdfjs";
          if (
            id.includes("node_modules/@uiw/react-codemirror/") ||
            id.includes("node_modules/@codemirror/")
          ) {
            return "codemirror";
          }
        },
      },
    },
  },
});
