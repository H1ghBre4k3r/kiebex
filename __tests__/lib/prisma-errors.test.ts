import { describe, expect, it } from "@jest/globals";
import { isKnownPrismaError, isPrismaErrorCode } from "@/lib/prisma-errors";
import { Prisma } from "@/generated/prisma/client";

function makeKnownError(code: string): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError("test error", {
    code,
    clientVersion: "0.0.0",
  });
}

describe("isKnownPrismaError", () => {
  it("returns true for a PrismaClientKnownRequestError", () => {
    expect(isKnownPrismaError(makeKnownError("P2002"))).toBe(true);
  });

  it("returns false for a plain Error", () => {
    expect(isKnownPrismaError(new Error("boom"))).toBe(false);
  });

  it("returns false for non-error values", () => {
    expect(isKnownPrismaError(null)).toBe(false);
    expect(isKnownPrismaError("string")).toBe(false);
    expect(isKnownPrismaError(42)).toBe(false);
  });
});

describe("isPrismaErrorCode", () => {
  it("returns true when the error matches the given code", () => {
    expect(isPrismaErrorCode(makeKnownError("P2002"), "P2002")).toBe(true);
  });

  it("returns false when the error has a different code", () => {
    expect(isPrismaErrorCode(makeKnownError("P2025"), "P2002")).toBe(false);
  });

  it("returns false for a plain Error", () => {
    expect(isPrismaErrorCode(new Error("boom"), "P2002")).toBe(false);
  });

  it("returns false for non-error values", () => {
    expect(isPrismaErrorCode(undefined, "P2002")).toBe(false);
  });
});
