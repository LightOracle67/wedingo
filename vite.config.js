/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

function buildTimestamp() {
  const ts = Date.now();
  return {
    name: "build-timestamp",
    transformIndexHtml(html) {
      return html.replace(
        "</head>",
        `<meta name="deploy-id" content="${ts}" />\n  <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />\n  <meta http-equiv="Pragma" content="no-cache" />\n  <meta http-equiv="Expires" content="0" />\n  </head>`
      );
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), buildTimestamp()],
  base: "/",
  test: {
    environment: "jsdom",
    environmentOptions: {
      jsdom: {
        url: "https://localhost",
      },
    },
  },
});
