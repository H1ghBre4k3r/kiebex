import { Prisma } from "@/generated/prisma/client";

export function isKnownPrismaError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError;
}

function mapAdapterCodeToPrismaLikeCode(code: string | undefined): string | null {
  if (!code) {
    return null;
  }

  if (code === "23505") {
    return "P2002";
  }

  if (code === "23503" || code === "23001") {
    return "P2003";
  }

  return null;
}

function getAdapterErrorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }

  if ("cause" in error && typeof error.cause === "object" && error.cause !== null) {
    if ("originalCode" in error.cause && typeof error.cause.originalCode === "string") {
      return error.cause.originalCode;
    }

    if ("code" in error.cause && typeof error.cause.code === "string") {
      return error.cause.code;
    }
  }

  if ("originalCode" in error && typeof error.originalCode === "string") {
    return error.originalCode;
  }

  return undefined;
}

export function isPrismaErrorCode(error: unknown, code: string): boolean {
  if (isKnownPrismaError(error)) {
    return error.code === code;
  }

  return mapAdapterCodeToPrismaLikeCode(getAdapterErrorCode(error)) === code;
}
