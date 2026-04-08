import { describe, expect, it, jest } from "@jest/globals";

const mockedAuthenticateUser = jest.fn<
  (input: { email: string; password: string }) => Promise<{
    id: string;
    email: string;
    displayName: string;
    role: "user" | "moderator" | "admin";
  } | null>
>();
const mockedCreateSession = jest.fn<(userId: string) => Promise<void>>();
const mockedRegisterUser = jest.fn<
  (input: { email: string; displayName: string; password: string }) => Promise<
    | {
        ok: true;
        user: {
          id: string;
          email: string;
          displayName: string;
          role: "user" | "moderator" | "admin";
        };
      }
    | {
        ok: false;
        code: "EMAIL_TAKEN";
      }
  >
>();
const mockedGetCurrentAuthUser = jest.fn<
  () => Promise<{
    id: string;
    email: string;
    displayName: string;
    role: "user" | "moderator" | "admin";
  } | null>
>();
const mockedRequireAuthUser = jest.fn<
  () => Promise<{
    id: string;
    email: string;
    displayName: string;
    role: "user" | "moderator" | "admin";
  }>
>();
const mockedClearCurrentSession = jest.fn<() => Promise<void>>();

jest.mock("@/lib/auth", () => {
  class UnauthorizedError extends Error {
    constructor(message = "Authentication required.") {
      super(message);
      this.name = "UnauthorizedError";
    }
  }

  return {
    UnauthorizedError,
    authenticateUser: mockedAuthenticateUser,
    createSession: mockedCreateSession,
    registerUser: mockedRegisterUser,
    getCurrentAuthUser: mockedGetCurrentAuthUser,
    requireAuthUser: mockedRequireAuthUser,
    clearCurrentSession: mockedClearCurrentSession,
  };
});

describe("auth routes", () => {
  it("POST /auth/login returns 401 for invalid credentials", async () => {
    mockedAuthenticateUser.mockResolvedValueOnce(null);

    const { POST } = await import("@/app/api/v1/auth/login/route");
    const response = await POST(
      new Request("http://localhost/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "test@example.com", password: "wrong-pass" }),
      }),
    );
    const body = (await response.json()) as { status: string; error: { code: string } };

    expect(response.status).toBe(401);
    expect(body.status).toBe("error");
    expect(body.error.code).toBe("INVALID_CREDENTIALS");
    expect(mockedCreateSession).not.toHaveBeenCalled();
  });

  it("POST /auth/login creates session and returns user", async () => {
    mockedAuthenticateUser.mockResolvedValueOnce({
      id: "user-1",
      email: "test@example.com",
      displayName: "Test",
      role: "user",
    });
    mockedCreateSession.mockResolvedValueOnce();

    const { POST } = await import("@/app/api/v1/auth/login/route");
    const response = await POST(
      new Request("http://localhost/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "test@example.com", password: "password123" }),
      }),
    );
    const body = (await response.json()) as {
      status: string;
      data: { user: { id: string; email: string } };
    };

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.data.user.id).toBe("user-1");
    expect(mockedCreateSession).toHaveBeenCalledWith("user-1");
  });

  it("POST /auth/register returns 409 when email already exists", async () => {
    mockedRegisterUser.mockResolvedValueOnce({ ok: false, code: "EMAIL_TAKEN" });

    const { POST } = await import("@/app/api/v1/auth/register/route");
    const response = await POST(
      new Request("http://localhost/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "anna@example.com",
          displayName: "Anna",
          password: "abc12345",
        }),
      }),
    );
    const body = (await response.json()) as { status: string; error: { code: string } };

    expect(response.status).toBe(409);
    expect(body.status).toBe("error");
    expect(body.error.code).toBe("EMAIL_IN_USE");
    expect(mockedCreateSession).not.toHaveBeenCalled();
  });

  it("POST /auth/register creates session for new user", async () => {
    mockedRegisterUser.mockResolvedValueOnce({
      ok: true,
      user: {
        id: "user-2",
        email: "new@example.com",
        displayName: "New User",
        role: "user",
      },
    });
    mockedCreateSession.mockResolvedValueOnce();

    const { POST } = await import("@/app/api/v1/auth/register/route");
    const response = await POST(
      new Request("http://localhost/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "new@example.com",
          displayName: "New User",
          password: "abc12345",
        }),
      }),
    );
    const body = (await response.json()) as {
      status: string;
      data: { user: { id: string } };
    };

    expect(response.status).toBe(201);
    expect(body.status).toBe("ok");
    expect(body.data.user.id).toBe("user-2");
    expect(mockedCreateSession).toHaveBeenCalledWith("user-2");
  });

  it("GET /auth/session returns unauthenticated when no user", async () => {
    mockedGetCurrentAuthUser.mockResolvedValueOnce(null);

    const { GET } = await import("@/app/api/v1/auth/session/route");
    const response = await GET();
    const body = (await response.json()) as {
      status: string;
      data: { authenticated: boolean; user: unknown };
    };

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.data.authenticated).toBe(false);
    expect(body.data.user).toBeNull();
  });

  it("GET /auth/me returns unauthorized when requireAuthUser throws", async () => {
    const auth = await import("@/lib/auth");
    mockedRequireAuthUser.mockRejectedValueOnce(new auth.UnauthorizedError());

    const { GET } = await import("@/app/api/v1/auth/me/route");
    const response = await GET();
    const body = (await response.json()) as { status: string; error: { code: string } };

    expect(response.status).toBe(401);
    expect(body.status).toBe("error");
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("POST /auth/logout clears current session", async () => {
    mockedClearCurrentSession.mockResolvedValueOnce();

    const { POST } = await import("@/app/api/v1/auth/logout/route");
    const response = await POST();
    const body = (await response.json()) as { status: string; data: { message: string } };

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.data.message).toBe("Logged out successfully.");
    expect(mockedClearCurrentSession).toHaveBeenCalledTimes(1);
  });
});
