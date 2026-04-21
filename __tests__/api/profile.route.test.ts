import { beforeEach, describe, expect, it, jest } from "@jest/globals";

type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  role: "user" | "moderator" | "admin";
};

const mockedRequireAuthUser = jest.fn<() => Promise<AuthUser>>();
const mockedUpdateDisplayName = jest.fn<(userId: string, displayName: string) => Promise<AuthUser>>();
const mockedUpdatePassword = jest.fn<
  (
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) => Promise<{ ok: true } | { ok: false; code: "WRONG_PASSWORD" }>
>();

jest.mock("@/lib/auth", () => {
  class UnauthorizedError extends Error {
    constructor(message = "Authentication required.") {
      super(message);
      this.name = "UnauthorizedError";
    }
  }

  class ForbiddenError extends Error {
    constructor(message = "Insufficient permissions.") {
      super(message);
      this.name = "ForbiddenError";
    }
  }

  return {
    UnauthorizedError,
    ForbiddenError,
    requireAuthUser: mockedRequireAuthUser,
    updateDisplayName: mockedUpdateDisplayName,
    updatePassword: mockedUpdatePassword,
  };
});

const TEST_USER: AuthUser = {
  id: "user-1",
  email: "user@example.com",
  displayName: "Test User",
  role: "user",
};

describe("GET /api/v1/auth/profile", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns the authenticated user", async () => {
    mockedRequireAuthUser.mockResolvedValueOnce(TEST_USER);

    const { GET } = await import("@/app/api/v1/auth/profile/route");
    const response = await GET();
    const body = (await response.json()) as {
      status: string;
      data: { user: AuthUser };
    };

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.data.user.id).toBe("user-1");
    expect(body.data.user.email).toBe("user@example.com");
  });

  it("returns 401 when not authenticated", async () => {
    const auth = await import("@/lib/auth");
    mockedRequireAuthUser.mockRejectedValueOnce(new auth.UnauthorizedError());

    const { GET } = await import("@/app/api/v1/auth/profile/route");
    const response = await GET();
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });
});

describe("PATCH /api/v1/auth/profile", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("updates display name when only displayName is provided", async () => {
    const updatedUser: AuthUser = { ...TEST_USER, displayName: "Updated Name" };
    mockedRequireAuthUser.mockResolvedValueOnce(TEST_USER);
    mockedUpdateDisplayName.mockResolvedValueOnce(updatedUser);

    const { PATCH } = await import("@/app/api/v1/auth/profile/route");
    const response = await PATCH(
      new Request("http://localhost/api/v1/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: "Updated Name" }),
      }),
    );
    const body = (await response.json()) as {
      status: string;
      data: { user: { displayName: string } };
    };

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.data.user.displayName).toBe("Updated Name");
    expect(mockedUpdateDisplayName).toHaveBeenCalledWith("user-1", "Updated Name");
    expect(mockedUpdatePassword).not.toHaveBeenCalled();
  });

  it("updates password when currentPassword and newPassword are both provided", async () => {
    mockedRequireAuthUser.mockResolvedValueOnce(TEST_USER);
    mockedUpdatePassword.mockResolvedValueOnce({ ok: true });

    const { PATCH } = await import("@/app/api/v1/auth/profile/route");
    const response = await PATCH(
      new Request("http://localhost/api/v1/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: "OldPass123!",
          newPassword: "NewPass456!",
        }),
      }),
    );
    const body = (await response.json()) as { status: string };

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(mockedUpdatePassword).toHaveBeenCalledWith(
      "user-1",
      "OldPass123!",
      "NewPass456!",
    );
    expect(mockedUpdateDisplayName).not.toHaveBeenCalled();
  });

  it("returns 400 when current password is wrong", async () => {
    mockedRequireAuthUser.mockResolvedValueOnce(TEST_USER);
    mockedUpdatePassword.mockResolvedValueOnce({ ok: false, code: "WRONG_PASSWORD" });

    const { PATCH } = await import("@/app/api/v1/auth/profile/route");
    const response = await PATCH(
      new Request("http://localhost/api/v1/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: "WrongPass!",
          newPassword: "NewPass456!",
        }),
      }),
    );
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("WRONG_PASSWORD");
  });

  it("returns 400 when neither displayName nor newPassword is provided", async () => {
    mockedRequireAuthUser.mockResolvedValueOnce(TEST_USER);

    const { PATCH } = await import("@/app/api/v1/auth/profile/route");
    const response = await PATCH(
      new Request("http://localhost/api/v1/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
    );
    const body = (await response.json()) as { status: string };

    expect(response.status).toBe(400);
    expect(body.status).toBe("error");
  });

  it("returns 401 when not authenticated", async () => {
    const auth = await import("@/lib/auth");
    mockedRequireAuthUser.mockRejectedValueOnce(new auth.UnauthorizedError());

    const { PATCH } = await import("@/app/api/v1/auth/profile/route");
    const response = await PATCH(
      new Request("http://localhost/api/v1/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: "New Name" }),
      }),
    );
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });
});
