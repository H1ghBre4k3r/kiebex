import client from "prom-client";

const register = new client.Registry();

register.setDefaultLabels({
  app: "kiebex",
});

client.collectDefaultMetrics({ register });

export const httpRequestDuration = new client.Histogram({
  name: "kiebex_http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
});

export const httpRequestTotal = new client.Counter({
  name: "kiebex_http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status_code"],
  registers: [register],
});

export const pageRenderDuration = new client.Histogram({
  name: "kiebex_page_render_duration_seconds",
  help: "Duration of server-rendered page requests in seconds",
  labelNames: ["route"],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
});

export const homepageStageDuration = new client.Histogram({
  name: "kiebex_homepage_stage_duration_seconds",
  help: "Duration of key homepage server-render stages in seconds",
  labelNames: ["stage"],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [register],
});

export function getMetrics(): Promise<string> {
  return register.metrics();
}

export function getContentType(): string {
  return register.contentType;
}

export function recordHttpRequest(
  method: string,
  route: string,
  statusCode: number,
  durationSeconds: number,
): void {
  const status = String(statusCode);
  httpRequestDuration.labels(method, route, status).observe(durationSeconds);
  httpRequestTotal.labels(method, route, status).inc();
}

export function recordPageRender(route: string, durationSeconds: number): void {
  pageRenderDuration.labels(route).observe(durationSeconds);
}

export function recordHomepageStage(stage: string, durationSeconds: number): void {
  homepageStageDuration.labels(stage).observe(durationSeconds);
}
