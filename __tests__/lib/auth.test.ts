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

  it("reuses the same auth lookup within a single render pass", async () => {
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
    const [first, second] = await Promise.all([getCurrentAuthUser(), getCurrentAuthUser()]);

    expect(first).toEqual(second);
    expect(mockedFindUnique).toHaveBeenCalledTimes(1);
  });
});
