import type { Config } from "jest";

const config: Config = {
  clearMocks: true,
  coverageProvider: "v8",
  coverageReporters: ["text", "json-summary", "lcov"],
  // Exclude generated code and test-infrastructure files from coverage metrics.
  // Generated files (Prisma client) are not authored here and must not count
  // against thresholds.  Test mocks live outside src/ anyway but are resolved
  // via moduleNameMapper, so explicitly ignore them too.
  coveragePathIgnorePatterns: [
    "<rootDir>/node_modules/",
    "<rootDir>/src/generated/",
    "<rootDir>/test/",
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 60,
      lines: 60,
      statements: 60,
    },
  },
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^server-only$": "<rootDir>/test/mocks/server-only.ts",
    "^next/headers$": "<rootDir>/test/mocks/next-headers.ts",
  },
  roots: ["<rootDir>/__tests__"],
  testEnvironment: "node",
  testPathIgnorePatterns: ["<rootDir>/.next/", "<rootDir>/node_modules/"],
  transform: {
    "^.+\\.(t|j)sx?$": [
      "@swc/jest",
      {
        jsc: {
          parser: {
            syntax: "typescript",
            tsx: true,
          },
          target: "es2022",
        },
      },
    ],
  },
};

export default config;
