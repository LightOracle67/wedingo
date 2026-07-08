/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

function buildTimestamp() {
  return {
    name: "build-timestamp",
    transformIndexHtml(html) {
      return html.replace(
        "</head>",
        `<meta name="build-id" content="${Date.now()}" />\n  </head>`
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
        url: "http://localhost",
      },
    },
  },
});
