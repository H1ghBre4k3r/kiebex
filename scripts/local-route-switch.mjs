import http from "node:http";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const port = Number(process.env.ROUTE_SWITCH_PORT ?? "3100");
const nextBaseUrl = process.env.NEXT_API_BASE_URL ?? "http://localhost:3000";
const rustBaseUrl = process.env.RUST_API_BASE_URL ?? "http://localhost:4000";

const rustRoutes = [
  { method: "GET", path: "/api/v1/health" },
  { method: "GET", path: "/api/v1/beer-styles" },
];

const requestHopByHopHeaders = new Set([
  "connection",
  "content-length",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

const responseHeadersToSkip = new Set([...requestHopByHopHeaders, "content-encoding"]);

function requestTargetFor(request) {
  const requestTarget = request.url ?? "/";
  if (requestTarget === "*") {
    return "/";
  }

  const url = new URL(requestTarget, "http://localhost");
  if (!requestTarget.startsWith("/") || url.origin !== "http://localhost") {
    return null;
  }

  return `${url.pathname}${url.search}`;
}

function targetBaseUrlFor(request, requestTarget) {
  const url = new URL(requestTarget, "http://localhost");
  const route = rustRoutes.find(
    (candidate) => candidate.method === request.method && candidate.path === url.pathname,
  );

  return route ? rustBaseUrl : nextBaseUrl;
}

function requestHeadersForProxy(request, targetUrl) {
  const headers = new Headers();

  for (const [name, value] of Object.entries(request.headers)) {
    if (requestHopByHopHeaders.has(name) || value === undefined) {
      continue;
    }

    headers.set(name, Array.isArray(value) ? value.join(", ") : value);
  }

  headers.set("host", targetUrl.host);
  return headers;
}

function responseHeadersForProxy(response) {
  const headers = [];

  response.headers.forEach((value, name) => {
    if (name !== "set-cookie" && !responseHeadersToSkip.has(name)) {
      headers.push([name, value]);
    }
  });

  for (const value of response.headers.getSetCookie()) {
    headers.push(["set-cookie", value]);
  }

  return headers;
}

function hasRequestBody(request) {
  return (
    request.method !== "GET" &&
    request.method !== "HEAD" &&
    (Number(request.headers["content-length"] ?? "0") > 0 || request.headers["transfer-encoding"])
  );
}

async function proxyRequest(request, response) {
  const requestTarget = requestTargetFor(request);
  if (!requestTarget) {
    response.writeHead(400, { "content-type": "text/plain; charset=utf-8" });
    response.end("Bad Request");
    return;
  }

  const targetBaseUrl = targetBaseUrlFor(request, requestTarget);
  const targetUrl = new URL(requestTarget, targetBaseUrl);

  const upstreamResponse = await fetch(targetUrl, {
    method: request.method,
    headers: requestHeadersForProxy(request, targetUrl),
    body: hasRequestBody(request) ? request : undefined,
    duplex: "half",
    redirect: "manual",
  });

  response.writeHead(upstreamResponse.status, responseHeadersForProxy(upstreamResponse));

  if (!upstreamResponse.body) {
    response.end();
    return;
  }

  await pipeline(Readable.fromWeb(upstreamResponse.body), response);
}

const server = http.createServer((request, response) => {
  proxyRequest(request, response).catch((error) => {
    console.error(error);
    if (response.headersSent) {
      response.destroy(error instanceof Error ? error : new Error(String(error)));
      return;
    }

    response.writeHead(502, { "content-type": "text/plain; charset=utf-8" });
    response.end("Bad Gateway");
  });
});

server.listen({ host: "127.0.0.1", port }, () => {
  const address = server.address();
  const actualPort = address && typeof address === "object" ? address.port : port;

  console.log(`Local route switch listening on http://127.0.0.1:${actualPort}`);
  console.log(`Next fallback: ${nextBaseUrl}`);
  for (const route of rustRoutes) {
    console.log(`Rust route: ${route.method} ${route.path} -> ${rustBaseUrl}`);
  }
});
