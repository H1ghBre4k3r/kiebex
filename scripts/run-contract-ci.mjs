import { spawn } from "node:child_process";

const port = process.env.CONTRACT_TEST_PORT ?? "3101";
const baseUrl = process.env.API_BASE_URL ?? `http://127.0.0.1:${port}`;
const healthUrl = new URL("/api/v1/health", baseUrl).toString();
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

let server;
let stoppingServer = false;

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: false,
      ...options,
    });

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(" ")} exited with ${signal ?? code}.`));
    });
  });
}

async function waitForHealth() {
  const timeoutMs = Number(process.env.CONTRACT_TEST_SERVER_TIMEOUT_MS ?? "60000");
  const deadline = Date.now() + timeoutMs;
  let lastError;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(healthUrl, { cache: "no-store" });
      if (response.ok) {
        return;
      }
      lastError = new Error(`Health check returned HTTP ${response.status}.`);
    } catch (error) {
      lastError = error;
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(
    `Timed out waiting for contract test server at ${healthUrl}.${lastError ? ` Last error: ${lastError.message}` : ""}`,
  );
}

function startServer() {
  server = spawn(npmCommand, ["run", "start:standalone"], {
    stdio: "inherit",
    env: {
      ...process.env,
      APP_URL: baseUrl,
      E2E_TEST_MODE: process.env.E2E_TEST_MODE ?? "true",
      PORT: port,
    },
  });

  server.on("exit", (code, signal) => {
    if (stoppingServer) {
      return;
    }

    if (code !== null && code !== 0) {
      console.error(`Contract test server exited early with ${signal ?? code}.`);
    }
  });
}

async function stopServer() {
  if (!server || server.killed) {
    return;
  }

  await new Promise((resolve) => {
    stoppingServer = true;

    const timeout = setTimeout(() => {
      server.kill("SIGKILL");
      resolve();
    }, 10000);

    server.once("exit", () => {
      clearTimeout(timeout);
      resolve();
    });

    server.kill("SIGTERM");
  });
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  let signalReceived = false;

  process.once(signal, async () => {
    if (signalReceived) {
      return;
    }
    signalReceived = true;
    await stopServer();
    process.exitCode = 128 + (signal === "SIGINT" ? 2 : 15);
  });
}

async function main() {
  await runCommand(npmCommand, ["run", "build"], {
    env: {
      ...process.env,
      APP_URL: baseUrl,
      E2E_TEST_MODE: process.env.E2E_TEST_MODE ?? "true",
    },
  });

  startServer();
  await waitForHealth();

  try {
    await runCommand(npmCommand, ["run", "test:contract"], {
      env: {
        ...process.env,
        API_BASE_URL: baseUrl,
      },
    });
  } finally {
    await stopServer();
  }
}

main().catch(async (error) => {
  await stopServer();
  console.error(error);
  process.exitCode = 1;
});
