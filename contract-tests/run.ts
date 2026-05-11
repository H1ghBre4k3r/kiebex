import { contracts } from "./contracts";
import {
  cleanupContractFixtures,
  disconnectContractFixtures,
  setupContractFixtures,
} from "./fixtures";
import { sendContractRequest } from "./http";
import { describeContractSelection, selectContracts } from "./select";

async function main(): Promise<void> {
  const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:3000";
  const selectedContracts = selectContracts(contracts);
  let passed = 0;

  console.log(describeContractSelection(contracts.length, selectedContracts.length));

  await setupContractFixtures();

  try {
    for (const contract of selectedContracts) {
      const response = await sendContractRequest(apiBaseUrl, contract.request);
      await contract.assert(response, { baseUrl: apiBaseUrl });
      passed += 1;
      console.log(`ok ${passed} - ${contract.name}`);
    }

    console.log(`\n${passed} contract test(s) passed against ${apiBaseUrl}.`);
  } finally {
    await cleanupContractFixtures();
    await disconnectContractFixtures();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
