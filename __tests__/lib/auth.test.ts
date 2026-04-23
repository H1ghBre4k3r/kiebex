import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockedCookies =
  jest.fn<() => Promise<{ get: (name: string) => { value: string } | undefined }>>();
const mockedFindUnique = jest.fn<
  () => Promise<{
    expiresAt: Date;
    user: {
      id: string;
      email: string;
      displayName: string;
      role: "user" | "moderator" | "admin";
    };
  } | null>
>();

jest.mock("next/headers", () => ({
  cookies: mockedCookies,
}));

jest.mock("@/lib/db", () => ({
  db: {
    session: {
      findUnique: mockedFindUnique,
    },
  },
}));

describe("getCurrentAuthUser", () => {
  beforeEach(() => {
    jest.resetModules();
    mockedCookies.mockReset();
    mockedFindUnique.mockReset();
  });

  it("reuses the same auth lookup within a single request context", async () => {
    mockedCookies.mockResolvedValue({
      get: (name) => (name === "kbi_session" ? { value: "session-token" } : undefined),
    });
    mockedFindUnique.mockResolvedValue({
      expiresAt: new Date(Date.now() + 60_000),
      user: {
        id: "user-1",
        email: "user@example.com",
        displayName: "User",
        role: "user",
      },
    });

    const { getCurrentAuthUser } = await import("@/lib/auth");
    const { runWithContext } = await import("@/lib/request-context");
    const [first, second] = await runWithContext({ requestId: "req-1" }, async () =>
      Promise.all([getCurrentAuthUser(), getCurrentAuthUser()]),
    );

    expect(first).toEqual(second);
    expect(mockedFindUnique).toHaveBeenCalledTimes(1);
  });

  it("does not reuse in-flight auth lookups across request contexts", async () => {
    mockedCookies.mockResolvedValue({
      get: (name) => (name === "kbi_session" ? { value: "session-token" } : undefined),
    });

    let resolveFirstLookup:
      | ((value: Awaited<ReturnType<typeof mockedFindUnique>>) => void)
      | undefined;

    const firstLookup = new Promise<Awaited<ReturnType<typeof mockedFindUnique>>>((resolve) => {
      resolveFirstLookup = resolve;
    });

    mockedFindUnique.mockImplementationOnce(() => firstLookup);
    mockedFindUnique.mockResolvedValueOnce(null);

    const { getCurrentAuthUser } = await import("@/lib/auth");
    const { runWithContext } = await import("@/lib/request-context");

    const firstRequestLookup = runWithContext({ requestId: "req-1" }, async () =>
      getCurrentAuthUser(),
    );
    await new Promise<void>((resolve) => setImmediate(resolve));

    const secondRequestLookup = runWithContext({ requestId: "req-2" }, async () =>
      getCurrentAuthUser(),
    );
    await new Promise<void>((resolve) => setImmediate(resolve));

    expect(mockedFindUnique).toHaveBeenCalledTimes(2);

    resolveFirstLookup?.({
      expiresAt: new Date(Date.now() + 60_000),
      user: {
        id: "user-1",
        email: "user@example.com",
        displayName: "User",
        role: "user",
      },
    });

    const [first, second] = await Promise.all([firstRequestLookup, secondRequestLookup]);

    expect(first).toEqual({
      id: "user-1",
      email: "user@example.com",
      displayName: "User",
      role: "user",
    });
    expect(second).toBeNull();
  });
});
