import client from "prom-client";

export type DirectoryQueryMetricLabels = {
  query_name: "offers_count" | "offers_page" | "approved_offer_sizes";
  sort: "price_asc" | "price_desc" | "name_asc" | "name_desc" | "na";
  filter_shape:
    | "none"
    | "brand"
    | "variant"
    | "style"
    | "size"
    | "serving"
    | "location_type"
    | "location"
    | "multi";
  page_bucket: "1" | "2_5" | "6_plus" | "na";
};

type MetricsStore = {
  register: client.Registry;
  httpRequestDuration: client.Histogram<"method" | "route" | "status_code">;
  httpRequestTotal: client.Counter<"method" | "route" | "status_code">;
  pageRenderDuration: client.Histogram<"route">;
  homepageStageDuration: client.Histogram<"stage">;
  directoryQueryDuration: client.Histogram<"query_name" | "sort" | "filter_shape" | "page_bucket">;
};

function createMetricsStore(): MetricsStore {
  const register = new client.Registry();

  register.setDefaultLabels({
    app: "kiebex",
  });

  client.collectDefaultMetrics({ register });

  return {
    register,
    httpRequestDuration: new client.Histogram({
      name: "kiebex_http_request_duration_seconds",
      help: "Duration of HTTP requests in seconds",
      labelNames: ["method", "route", "status_code"],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [register],
    }),
    httpRequestTotal: new client.Counter({
      name: "kiebex_http_requests_total",
      help: "Total number of HTTP requests",
      labelNames: ["method", "route", "status_code"],
      registers: [register],
    }),
    pageRenderDuration: new client.Histogram({
      name: "kiebex_page_render_duration_seconds",
      help: "Duration of server-rendered page requests in seconds",
      labelNames: ["route"],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [register],
    }),
    homepageStageDuration: new client.Histogram({
      name: "kiebex_homepage_stage_duration_seconds",
      help: "Duration of key homepage server-render stages in seconds",
      labelNames: ["stage"],
      buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
      registers: [register],
    }),
    directoryQueryDuration: new client.Histogram({
      name: "kiebex_directory_query_duration_seconds",
      help: "Duration of directory-related database queries in seconds",
      labelNames: ["query_name", "sort", "filter_shape", "page_bucket"],
      buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
      registers: [register],
    }),
  };
}

const globalMetrics = globalThis as typeof globalThis & {
  __kiebexMetricsStore?: MetricsStore;
};

const metricsStore = globalMetrics.__kiebexMetricsStore ?? createMetricsStore();

if (!globalMetrics.__kiebexMetricsStore) {
  globalMetrics.__kiebexMetricsStore = metricsStore;
}

const {
  register,
  httpRequestDuration,
  httpRequestTotal,
  pageRenderDuration,
  homepageStageDuration,
  directoryQueryDuration,
} = metricsStore;

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

export function recordDirectoryQuery(
  labels: DirectoryQueryMetricLabels,
  durationSeconds: number,
): void {
  directoryQueryDuration
    .labels(labels.query_name, labels.sort, labels.filter_shape, labels.page_bucket)
    .observe(durationSeconds);
}
