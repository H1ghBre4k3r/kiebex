import { inspect } from "node:util";

import { assertDeepEqual } from "./assert";
import { contracts } from "./contracts";
import {
  cleanupContractFixtures,
  disconnectContractFixtures,
  setupContractFixtures,
} from "./fixtures";
import { sendContractRequest } from "./http";

async function main(): Promise<void> {
  const nextApiBaseUrl = process.env.NEXT_API_BASE_URL;
  const rustApiBaseUrl = process.env.RUST_API_BASE_URL;

  if (!nextApiBaseUrl) {
    throw new Error(
      "NEXT_API_BASE_URL is required, for example NEXT_API_BASE_URL=http://localhost:3000.",
    );
  }

  if (!rustApiBaseUrl) {
    throw new Error(
      "RUST_API_BASE_URL is required, for example RUST_API_BASE_URL=http://localhost:4000.",
    );
  }

  let passed = 0;

  await setupContractFixtures();

  try {
    for (const contract of contracts) {
      const [nextResponse, rustResponse] = await Promise.all([
        sendContractRequest(nextApiBaseUrl, contract.request),
        sendContractRequest(rustApiBaseUrl, contract.request),
      ]);

      await contract.assert(nextResponse, { baseUrl: nextApiBaseUrl });
      await contract.assert(rustResponse, { baseUrl: rustApiBaseUrl });

      const normalize = contract.normalize ?? ((response: typeof nextResponse) => response);
      const normalizedNextResponse = normalize(nextResponse);
      const normalizedRustResponse = normalize(rustResponse);

      try {
        assertDeepEqual(
          normalizedRustResponse,
          normalizedNextResponse,
          `Expected Rust response to match Next response for ${contract.name}.`,
        );
      } catch (error) {
        console.error("Next response:");
        console.error(inspect(normalizedNextResponse, { depth: null, colors: true }));
        console.error("Rust response:");
        console.error(inspect(normalizedRustResponse, { depth: null, colors: true }));
        throw error;
      }

      passed += 1;
      console.log(`ok ${passed} - ${contract.name}`);
    }

    console.log(
      `\n${passed} parity contract test(s) passed between ${nextApiBaseUrl} and ${rustApiBaseUrl}.`,
    );
  } finally {
    await cleanupContractFixtures();
    await disconnectContractFixtures();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
