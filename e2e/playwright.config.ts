import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: "http://localhost:4173",
    headless: true,
  },
  webServer: {
    command: "npm run build && npx vite preview --port 4173",
    port: 4173,
    timeout: 120000,
    reuseExistingServer: !process.env.CI,
    env: {
      VITE_FIREBASE_API_KEY: process.env.VITE_FIREBASE_API_KEY || "",
      VITE_FIREBASE_AUTH_DOMAIN: process.env.VITE_FIREBASE_AUTH_DOMAIN || "",
      VITE_FIREBASE_PROJECT_ID: process.env.VITE_FIREBASE_PROJECT_ID || "",
      VITE_FIREBASE_STORAGE_BUCKET: process.env.VITE_FIREBASE_STORAGE_BUCKET || "",
      VITE_FIREBASE_MESSAGING_SENDER_ID: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
      VITE_FIREBASE_APP_ID: process.env.VITE_FIREBASE_APP_ID || "",
      VITE_ADMIN_EMAILS: process.env.VITE_ADMIN_EMAILS || "",
      VITE_SUPERADMIN_ROUTE: process.env.VITE_SUPERADMIN_ROUTE || "",
    },
  },
});
