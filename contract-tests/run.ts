import { contracts } from "./contracts";
import { sendContractRequest } from "./http";

async function main(): Promise<void> {
  const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:3000";
  let passed = 0;

  for (const contract of contracts) {
    const response = await sendContractRequest(apiBaseUrl, contract.request);
    await contract.assert(response, { baseUrl: apiBaseUrl });
    passed += 1;
    console.log(`ok ${passed} - ${contract.name}`);
  }

  console.log(`\n${passed} contract test(s) passed against ${apiBaseUrl}.`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
