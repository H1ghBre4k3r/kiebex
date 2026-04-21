import { spawn } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const projectDir = dirname(scriptsDir);
const nextDir = join(projectDir, ".next");
const standaloneDir = join(nextDir, "standalone");
const serverPath = join(standaloneDir, "server.js");
const staticPath = join(nextDir, "static");
const standaloneStaticPath = join(standaloneDir, ".next", "static");

if (!existsSync(serverPath) || !existsSync(staticPath)) {
  throw new Error("Standalone build output is missing. Run `npm run build` first.");
}

mkdirSync(dirname(standaloneStaticPath), { recursive: true });
rmSync(standaloneStaticPath, { recursive: true, force: true });
cpSync(staticPath, standaloneStaticPath, { recursive: true });

const child = spawn(process.execPath, [serverPath], {
  cwd: projectDir,
  env: process.env,
  stdio: "inherit",
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    child.kill(signal);
  });
}

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
