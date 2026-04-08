import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Ensure the Prisma generated client is included in the standalone trace.
  // The new prisma-client generator emits runtime code to src/generated/prisma,
  // which nft may not trace automatically for every route.
  outputFileTracingIncludes: {
    "/**": ["./src/generated/prisma/**/*"],
  },
};

export default nextConfig;
