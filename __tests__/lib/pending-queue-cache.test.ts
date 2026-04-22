import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockedRevalidateTag = jest.fn<(tag: string, profile: string) => void>();
const mockedUnstableCache = jest.fn((fn: (...args: never[]) => Promise<unknown>) => fn);
const mockedGetPendingQueueCount = jest.fn<() => Promise<number>>();

jest.mock("next/cache", () => ({
  revalidateTag: mockedRevalidateTag,
  unstable_cache: mockedUnstableCache,
}));

jest.mock("@/lib/query", () => ({
  getPendingQueueCount: mockedGetPendingQueueCount,
}));

describe("pending queue cache", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const env = process.env as NodeJS.ProcessEnv & { NODE_ENV: string | undefined };

  beforeEach(() => {
    jest.resetModules();
    mockedRevalidateTag.mockReset();
    mockedUnstableCache.mockClear();
    mockedGetPendingQueueCount.mockReset();
    env.NODE_ENV = originalNodeEnv;
  });

  it("loads the pending count through a cached wrapper", async () => {
    mockedGetPendingQueueCount.mockResolvedValue(7);

    const { getCachedPendingQueueCount } = await import("@/lib/pending-queue-cache");
    const result = await getCachedPendingQueueCount();

    expect(result).toBe(7);
    expect(mockedUnstableCache.mock.calls[0]).toEqual([
      expect.any(Function),
      ["pending-queue-count"],
      { tags: ["pending-queue-count"] },
    ]);
  });

  it("skips invalidation during Jest tests", async () => {
    const { invalidatePendingQueueCountCache } = await import("@/lib/pending-queue-cache");

    invalidatePendingQueueCountCache();

    expect(mockedRevalidateTag).not.toHaveBeenCalled();
  });

  it("invalidates the shared tag outside the test environment", async () => {
    env.NODE_ENV = "development";

    const { invalidatePendingQueueCountCache } = await import("@/lib/pending-queue-cache");

    invalidatePendingQueueCountCache();

    expect(mockedRevalidateTag).toHaveBeenCalledWith("pending-queue-count", "max");
  });

  it("ignores missing revalidation context outside Next runtime", async () => {
    env.NODE_ENV = "development";
    mockedRevalidateTag.mockImplementation(() => {
      throw new Error(
        "Invariant: static generation store missing in revalidateTag pending-queue-count",
      );
    });

    const { invalidatePendingQueueCountCache } = await import("@/lib/pending-queue-cache");

    expect(() => invalidatePendingQueueCountCache()).not.toThrow();
  });
});
