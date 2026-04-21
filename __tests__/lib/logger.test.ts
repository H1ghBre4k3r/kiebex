import { describe, expect, it, jest, beforeEach } from "@jest/globals";

jest.mock("@sentry/nextjs", () => ({
  logger: {
    info: () => {},
    warn: () => {},
    error: () => {},
  },
}));

// Import after mock registration so logger.ts picks up the stub.
import { logger } from "@/lib/logger";

describe("logger", () => {
  beforeEach(() => {
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  it("logger.info writes a prefixed line to console.log", () => {
    logger.info("test info message", { key: "value" });
    expect(console.log).toHaveBeenCalled();
    const call = (console.log as jest.Mock).mock.calls[0][0] as string;
    expect(call).toContain("[INFO]");
    expect(call).toContain("test info message");
  });

  it("logger.warn writes a prefixed line to console.log", () => {
    logger.warn("test warn message");
    expect(console.log).toHaveBeenCalled();
    const call = (console.log as jest.Mock).mock.calls[0][0] as string;
    expect(call).toContain("[WARN]");
  });

  it("logger.error writes to console.error", () => {
    logger.error("test error message", { code: 500 });
    expect(console.error).toHaveBeenCalled();
    const call = (console.error as jest.Mock).mock.calls[0][0] as string;
    expect(call).toContain("[ERROR]");
    expect(call).toContain("test error message");
  });
});
