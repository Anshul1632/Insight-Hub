import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Uncomment to proxy API calls during local dev instead of using
    // VITE_API_BASE_URL (both work; the backend's CORS config already
    // allows http://localhost:5173 directly).
    // proxy: {
    //   "/api": "http://localhost:8000",
    // },
  },
});
