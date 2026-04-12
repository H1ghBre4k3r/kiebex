import { Prisma } from "@/generated/prisma/client";

export function isKnownPrismaError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError;
}

export function isPrismaErrorCode(error: unknown, code: string): boolean {
  return isKnownPrismaError(error) && error.code === code;
}
