import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  server: {
    port: 5174,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "포커스토익 — FocusTOEIC",
        short_name: "FocusTOEIC",
        description: "ADHD 학습자를 위한 토익 학습 앱",
        lang: "ko",
        theme_color: "#4f46e5",
        background_color: "#ffffff",
        display: "standalone",
        icons: [
          {
            src: "/icon-placeholder.svg",
            sizes: "192x192",
            type: "image/svg+xml",
          },
          {
            src: "/icon-placeholder.svg",
            sizes: "512x512",
            type: "image/svg+xml",
          },
          {
            src: "/icon-placeholder.svg",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
        ],
      },
    }),
  ],
});
