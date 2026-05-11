import http from "node:http";

const port = Number(process.env.ROUTE_SWITCH_PORT ?? "3100");
const nextBaseUrl = process.env.NEXT_API_BASE_URL ?? "http://localhost:3000";
const rustBaseUrl = process.env.RUST_API_BASE_URL ?? "http://localhost:4000";

const rustRoutes = [{ method: "GET", path: "/api/v1/health" }];

const hopByHopHeaders = new Set([
  "connection",
  "content-encoding",
  "content-length",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

function targetBaseUrlFor(request) {
  const url = new URL(request.url ?? "/", "http://localhost");
  const route = rustRoutes.find(
    (candidate) => candidate.method === request.method && candidate.path === url.pathname,
  );

  return route ? rustBaseUrl : nextBaseUrl;
}

function requestHeadersForProxy(request, targetUrl) {
  const headers = new Headers();

  for (const [name, value] of Object.entries(request.headers)) {
    if (hopByHopHeaders.has(name) || value === undefined) {
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
    if (!hopByHopHeaders.has(name)) {
      headers.push([name, value]);
    }
  });

  return headers;
}

function hasRequestBody(request) {
  return request.method !== "GET" && request.method !== "HEAD";
}

async function proxyRequest(request, response) {
  const targetBaseUrl = targetBaseUrlFor(request);
  const targetUrl = new URL(request.url ?? "/", targetBaseUrl);

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

  await upstreamResponse.body.pipeTo(
    new WritableStream({
      write(chunk) {
        response.write(chunk);
      },
      close() {
        response.end();
      },
      abort(error) {
        response.destroy(error);
      },
    }),
  );
}

const server = http.createServer((request, response) => {
  proxyRequest(request, response).catch((error) => {
    console.error(error);
    if (!response.headersSent) {
      response.writeHead(502, { "content-type": "text/plain; charset=utf-8" });
    }
    response.end("Bad Gateway");
  });
});

server.listen(port, () => {
  console.log(`Local route switch listening on http://localhost:${port}`);
  console.log(`Next fallback: ${nextBaseUrl}`);
  for (const route of rustRoutes) {
    console.log(`Rust route: ${route.method} ${route.path} -> ${rustBaseUrl}`);
  }
});
