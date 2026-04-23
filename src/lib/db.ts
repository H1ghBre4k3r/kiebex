import { PrismaClient, type PrismaClient as PrismaClientType } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import {
  isDirectoryQuerySqlCaptureEnabled,
  logCapturedDirectoryQuerySql,
} from "@/lib/directory-query-sql-capture";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaPool: Pool | undefined;
};

const pool =
  globalForPrisma.prismaPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
  });

const adapter = new PrismaPg(pool);
const shouldCaptureDirectorySql = isDirectoryQuerySqlCaptureEnabled();

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: shouldCaptureDirectorySql ? [{ emit: "event", level: "query" }] : undefined,
  });

if (shouldCaptureDirectorySql) {
  (db as PrismaClientType<"query">).$on("query", (event) => {
    logCapturedDirectoryQuerySql(event);
  });
}

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
  globalForPrisma.prismaPool = pool;
}
