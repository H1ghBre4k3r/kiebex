import { describe, expect, it } from "@jest/globals";

// request-context does not import server-only or next/* — no mocks needed.
import { getRequestContext, runWithContext, setUserId } from "@/lib/request-context";

describe("request-context", () => {
  it("returns undefined when called outside a context", () => {
    // AsyncLocalStorage returns undefined when no store is active.
    expect(getRequestContext()).toBeUndefined();
  });

  it("returns the context set by runWithContext", async () => {
    let captured: ReturnType<typeof getRequestContext>;

    await runWithContext({ requestId: "test-id-1" }, async () => {
      captured = getRequestContext();
    });

    expect(captured).toEqual({ requestId: "test-id-1" });
  });

  it("setUserId mutates the current context", async () => {
    let captured: ReturnType<typeof getRequestContext>;

    await runWithContext({ requestId: "test-id-2" }, async () => {
      setUserId("user-42");
      captured = getRequestContext();
    });

    expect(captured).toEqual({ requestId: "test-id-2", userId: "user-42" });
  });

  it("setUserId is a no-op outside a context", () => {
    // Should not throw even when there is no active store.
    expect(() => setUserId("orphan-user")).not.toThrow();
  });

  it("isolates concurrent contexts from each other", async () => {
    const results: string[] = [];

    // Start two overlapping async contexts and verify they don't bleed into
    // each other — this is the core correctness property of AsyncLocalStorage.
    await Promise.all([
      runWithContext({ requestId: "ctx-A" }, async () => {
        // Yield to let the other context start.
        await new Promise<void>((resolve) => setImmediate(resolve));
        results.push(getRequestContext()?.requestId ?? "missing");
      }),
      runWithContext({ requestId: "ctx-B" }, async () => {
        await new Promise<void>((resolve) => setImmediate(resolve));
        results.push(getRequestContext()?.requestId ?? "missing");
      }),
    ]);

    // Both contexts must have seen their own requestId — order is not guaranteed.
    expect(results).toHaveLength(2);
    expect(results).toContain("ctx-A");
    expect(results).toContain("ctx-B");
  });

  it("nested contexts are independent", async () => {
    let innerCtx: ReturnType<typeof getRequestContext>;
    let outerCtxAfterNested: ReturnType<typeof getRequestContext>;

    await runWithContext({ requestId: "outer" }, async () => {
      await runWithContext({ requestId: "inner" }, async () => {
        innerCtx = getRequestContext();
      });
      outerCtxAfterNested = getRequestContext();
    });

    expect(innerCtx?.requestId).toBe("inner");
    expect(outerCtxAfterNested?.requestId).toBe("outer");
  });
});
