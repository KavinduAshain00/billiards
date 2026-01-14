import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { resolve } from "path"

export default defineConfig({
  root: ".",
  publicDir: "public",
  plugins: [react()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["three", "socket.io-client", "interactjs", "jsoncrush"],
          react: ["react", "react-dom", "react-router-dom"],
        },
      },
    },
    sourcemap: true,
    minify: "terser",
    terserOptions: {
      safari10: true,
    },
  },
  resolve: {
    extensions: [".tsx", ".ts", ".jsx", ".js"],
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  esbuild: {
    target: "es2015",
  },
})
