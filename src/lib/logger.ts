type LogLevel = "info" | "warn" | "error";

type LogMeta = Record<string, unknown>;

const LEVEL_PREFIX: Record<LogLevel, string> = {
  info: "[INFO]",
  warn: "[WARN]",
  error: "[ERROR]",
};

function write(level: LogLevel, message: string, meta?: LogMeta): void {
  const isDev = process.env.NODE_ENV !== "production";

  if (isDev) {
    const prefix = LEVEL_PREFIX[level];
    const metaStr = meta ? " " + JSON.stringify(meta) : "";
    const line = `${prefix} ${message}${metaStr}`;
    if (level === "error") {
      console.error(line);
    } else {
      console.log(line);
    }
  } else {
    const entry = JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      message,
      ...meta,
    });
    if (level === "error") {
      console.error(entry);
    } else {
      console.log(entry);
    }
  }
}

export const logger = {
  info: (message: string, meta?: LogMeta) => write("info", message, meta),
  warn: (message: string, meta?: LogMeta) => write("warn", message, meta),
  error: (message: string, meta?: LogMeta) => write("error", message, meta),
};
