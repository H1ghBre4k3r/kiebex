import { spawn, type ChildProcessByStdio } from "node:child_process";
import {
  createServer,
  request as httpRequest,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import { once } from "node:events";
import { resolve } from "node:path";
import type { Readable } from "node:stream";
import { gzipSync } from "node:zlib";
import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from "@jest/globals";

jest.setTimeout(15_000);

type RequestHandler = (request: IncomingMessage, response: ServerResponse) => void | Promise<void>;

type FixtureServer = {
  server: Server;
  url: string;
};

type ProxyProcess = {
  child: ChildProcessByStdio<null, Readable, Readable>;
  url: string;
};

type RawResponse = {
  body: Buffer;
  headers: IncomingMessage["headers"];
  statusCode: number;
};

async function startFixtureServer(handler: RequestHandler): Promise<FixtureServer> {
  const server = createServer((request, response) => {
    Promise.resolve(handler(request, response)).catch((error: unknown) => {
      response.destroy(error instanceof Error ? error : new Error(String(error)));
    });
  });

  await new Promise<void>((resolvePromise, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolvePromise());
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Fixture server did not expose a TCP address.");
  }

  return { server, url: `http://127.0.0.1:${address.port}` };
}

async function closeServer(server: Server): Promise<void> {
  if (!server.listening) {
    return;
  }

  await new Promise<void>((resolvePromise) => server.close(() => resolvePromise()));
}

async function findFreePort(): Promise<number> {
  const fixture = await startFixtureServer((_request, response) => {
    response.end();
  });
  const port = Number(new URL(fixture.url).port);
  await closeServer(fixture.server);
  return port;
}

async function startProxy(nextUrl: string, rustUrl: string): Promise<ProxyProcess> {
  const port = await findFreePort();
  const child = spawn(
    process.execPath,
    [resolve(process.cwd(), "scripts/local-route-switch.mjs")],
    {
      env: {
        ...process.env,
        NEXT_API_BASE_URL: nextUrl,
        ROUTE_SWITCH_PORT: String(port),
        RUST_API_BASE_URL: rustUrl,
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  let output = "";
  const listeningPort = await new Promise<number>((resolvePromise, reject) => {
    const onOutput = (chunk: Buffer | string) => {
      output += chunk.toString();
      if (
        output.includes(`listening on http://localhost:${port}`) ||
        output.includes(`listening on http://127.0.0.1:${port}`)
      ) {
        resolvePromise(port);
      }
    };

    child.stdout.on("data", onOutput);
    child.stderr.on("data", onOutput);
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      reject(new Error(`Route switch exited before listening (${code ?? signal}).\n${output}`));
    });
  });

  return { child, url: `http://127.0.0.1:${listeningPort}` };
}

async function stopProxy(child: ChildProcessByStdio<null, Readable, Readable>): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) {
    return;
  }

  await new Promise<void>((resolvePromise) => {
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      resolvePromise();
    }, 1_000);

    child.once("exit", () => {
      clearTimeout(timer);
      resolvePromise();
    });
    child.kill("SIGTERM");
  });
}

async function requestRaw(
  baseUrl: string,
  options: {
    body?: Buffer;
    headers?: Record<string, string>;
    method?: string;
    path?: string;
  } = {},
): Promise<RawResponse> {
  const target = new URL(baseUrl);

  return new Promise<RawResponse>((resolvePromise, reject) => {
    const request = httpRequest(
      {
        headers: options.headers,
        hostname: target.hostname,
        method: options.method ?? "GET",
        path: options.path ?? `${target.pathname}${target.search}`,
        port: target.port,
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
        response.on("end", () => {
          resolvePromise({
            body: Buffer.concat(chunks),
            headers: response.headers,
            statusCode: response.statusCode ?? 0,
          });
        });
        response.on("error", reject);
      },
    );

    request.on("error", reject);
    if (options.body) {
      request.write(options.body);
    }
    request.end();
  });
}

async function readSlowly(baseUrl: string, path: string): Promise<Buffer> {
  const target = new URL(baseUrl);

  return new Promise<Buffer>((resolvePromise, reject) => {
    const request = httpRequest(
      {
        hostname: target.hostname,
        path,
        port: target.port,
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => {
          response.pause();
          chunks.push(Buffer.from(chunk));
          setTimeout(() => response.resume(), 1);
        });
        response.on("end", () => resolvePromise(Buffer.concat(chunks)));
        response.on("error", reject);
      },
    );

    request.on("error", reject);
    request.end();
  });
}

describe("local route switch", () => {
  let nextServer!: FixtureServer;
  let rustServer!: FixtureServer;
  let attackerServer!: FixtureServer;
  let proxy!: ProxyProcess;
  let rustPaths: string[];
  let attackerHits: number;
  let nextRequestBody: Buffer | undefined;
  let nextRequestEncoding: string | undefined;

  beforeAll(async () => {
    nextServer = await startFixtureServer(async (request, response) => {
      if (request.url === "/cookies") {
        response.writeHead(200, {
          "content-type": "text/plain",
          "set-cookie": ["first=one; Path=/", "second=two; Path=/"],
        });
        response.end("cookies");
        return;
      }

      if (request.url === "/large") {
        const chunk = Buffer.alloc(64 * 1024, "x");
        response.writeHead(200, { "content-type": "application/octet-stream" });
        for (let index = 0; index < 32; index += 1) {
          if (!response.write(chunk)) {
            await once(response, "drain");
          }
        }
        response.end();
        return;
      }

      if (request.method === "POST" && request.url === "/api/v1/beers") {
        const chunks: Buffer[] = [];
        request.on("data", (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
        await once(request, "end");
        nextRequestBody = Buffer.concat(chunks);
        nextRequestEncoding = request.headers["content-encoding"];
      }

      response.writeHead(200, { "content-type": "text/plain" });
      response.end("next");
    });

    rustServer = await startFixtureServer((request, response) => {
      rustPaths.push(request.url ?? "/");
      response.writeHead(200, { "content-type": "text/plain" });
      response.end("rust");
    });

    attackerServer = await startFixtureServer((_request, response) => {
      attackerHits += 1;
      response.writeHead(200, { "content-type": "text/plain" });
      response.end("attacker");
    });

    proxy = await startProxy(nextServer.url, rustServer.url);
  });

  beforeEach(() => {
    rustPaths = [];
    attackerHits = 0;
    nextRequestBody = undefined;
    nextRequestEncoding = undefined;
  });

  afterAll(async () => {
    if (proxy) {
      await stopProxy(proxy.child);
    }
    if (nextServer) {
      await closeServer(nextServer.server);
    }
    if (rustServer) {
      await closeServer(rustServer.server);
    }
    if (attackerServer) {
      await closeServer(attackerServer.server);
    }
  });

  it("routes the explicit Rust method and path allowlist", async () => {
    const health = await requestRaw(proxy.url, { path: "/api/v1/health" });
    const styles = await requestRaw(proxy.url, { path: "/api/v1/beer-styles" });
    const beers = await requestRaw(proxy.url, { path: "/api/v1/beers" });

    expect(health.body.toString()).toBe("rust");
    expect(styles.body.toString()).toBe("rust");
    expect(beers.body.toString()).toBe("next");
    expect(rustPaths).toEqual(["/api/v1/health", "/api/v1/beer-styles"]);
  });

  it("preserves content encoding and compressed request bytes", async () => {
    const body = gzipSync(Buffer.from('{"name":"test"}'));
    const response = await requestRaw(proxy.url, {
      body,
      headers: {
        "content-encoding": "gzip",
        "content-length": String(body.length),
        "content-type": "application/json",
      },
      method: "POST",
      path: "/api/v1/beers",
    });

    expect(response.statusCode).toBe(200);
    expect(nextRequestEncoding).toBe("gzip");
    expect(nextRequestBody).toEqual(body);
  });

  it("forwards multiple Set-Cookie headers separately", async () => {
    const response = await requestRaw(proxy.url, { path: "/cookies" });

    expect(response.headers["set-cookie"]).toEqual(["first=one; Path=/", "second=two; Path=/"]);
  });

  it("streams a large response completely to a slow client", async () => {
    const body = await readSlowly(proxy.url, "/large");

    expect(body.length).toBe(2 * 1024 * 1024);
    expect(body.every((byte) => byte === 120)).toBe(true);
  });

  it("rejects absolute-form request targets", async () => {
    const response = await requestRaw(proxy.url, {
      path: `${attackerServer.url}/secret`,
    });

    expect(response.statusCode).toBe(400);
    expect(attackerHits).toBe(0);
  });
});
