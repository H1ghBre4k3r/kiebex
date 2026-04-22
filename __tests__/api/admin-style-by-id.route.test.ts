import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockedRequireAdminUser =
  jest.fn<() => Promise<{ id: string; displayName: string; role: "admin" }>>();
const mockedEditAdminStyle =
  jest.fn<
    (
      styleId: string,
      name: string,
    ) => Promise<{ style: { id: string; name: string }; previousName: string } | null>
  >();
const mockedDeleteAdminStyle =
  jest.fn<(styleId: string) => Promise<{ deleted: false } | { deleted: true; name: string }>>();
const mockedLogModerationAction = jest.fn<() => Promise<void>>();
const mockedIsPrismaErrorCode = jest.fn<(error: unknown, code: string) => boolean>();

jest.mock("@/lib/auth", () => {
  class UnauthorizedError extends Error {}
  class ForbiddenError extends Error {}

  return {
    UnauthorizedError,
    ForbiddenError,
    requireAdminUser: mockedRequireAdminUser,
    requireAuthUser: jest.fn(),
    requireModeratorUser: jest.fn(),
  };
});

jest.mock("@/lib/query", () => ({
  editAdminStyle: mockedEditAdminStyle,
  deleteAdminStyle: mockedDeleteAdminStyle,
  logModerationAction: mockedLogModerationAction,
}));

jest.mock("@/lib/prisma-errors", () => ({
  isPrismaErrorCode: mockedIsPrismaErrorCode,
}));

describe("admin style route Prisma error mapping", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedRequireAdminUser.mockResolvedValue({
      id: "admin-1",
      displayName: "Admin",
      role: "admin",
    });
    mockedIsPrismaErrorCode.mockImplementation(
      (error, code) => (error as { code?: string })?.code === code,
    );
  });

  it("maps duplicate style name conflicts to STYLE_NAME_CONFLICT", async () => {
    mockedEditAdminStyle.mockRejectedValueOnce({ code: "P2002" });

    const { PUT } = await import("@/app/api/v1/admin/styles/[styleId]/route");
    const response = await PUT(
      new Request("http://localhost/api/v1/admin/styles/style-1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Duplicate" }),
      }),
      { params: Promise.resolve({ styleId: "style-1" }) },
    );
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(409);
    expect(body.error.code).toBe("STYLE_NAME_CONFLICT");
    expect(mockedLogModerationAction).not.toHaveBeenCalled();
  });

  it("maps in-use deletions to STYLE_IN_USE", async () => {
    mockedDeleteAdminStyle.mockRejectedValueOnce({ code: "P2003" });

    const { DELETE } = await import("@/app/api/v1/admin/styles/[styleId]/route");
    const response = await DELETE(new Request("http://localhost/api/v1/admin/styles/style-1"), {
      params: Promise.resolve({ styleId: "style-1" }),
    });
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(409);
    expect(body.error.code).toBe("STYLE_IN_USE");
    expect(mockedLogModerationAction).not.toHaveBeenCalled();
  });
});
