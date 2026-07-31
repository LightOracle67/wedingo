// Load test básico con k6
// Uso: k6 run scripts/load-test.js
// Instalar: brew install k6

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "https://wedingo-6c26a.web.app";

const errorRate = new Rate("failed_requests");

export const options = {
  stages: [
    { duration: "30s", target: 20 },  // ramp up a 20 usuarios
    { duration: "1m", target: 50 },   // subir a 50
    { duration: "30s", target: 0 },   // ramp down
  ],
  thresholds: {
    http_req_duration: ["p(95)<2000"], // 95% de las peticiones < 2s
    failed_requests: ["rate<0.05"],    // menos del 5% de fallos
  },
};

export default function () {
  // Landing page
  const landing = http.get(`${BASE_URL}/`);
  check(landing, { "landing 200": (r) => r.status === 200 });
  errorRate.add(landing.status !== 200);
  sleep(1);

  // Página pública con token de ejemplo (no existe, pero verifica SPA routing)
  const invite = http.get(`${BASE_URL}/abc123`);
  check(invite, { "invite 200": (r) => r.status === 200 });
  errorRate.add(invite.status !== 200);
  sleep(1);
}
