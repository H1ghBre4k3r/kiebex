import type { ContractCase } from "./types";

const PATTERN_ENV = "CONTRACT_TEST_PATTERN";

function parsePatterns(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((pattern) => pattern.trim().toLowerCase())
    .filter(Boolean);
}

function matchesPattern(contract: ContractCase, pattern: string): boolean {
  return (
    contract.name.toLowerCase().includes(pattern) ||
    contract.request.path.toLowerCase().includes(pattern)
  );
}

export function selectContracts(contracts: ContractCase[]): ContractCase[] {
  const patterns = parsePatterns(process.env[PATTERN_ENV]);

  if (patterns.length === 0) {
    return contracts;
  }

  const selected = contracts.filter((contract) =>
    patterns.some((pattern) => matchesPattern(contract, pattern)),
  );

  if (selected.length === 0) {
    throw new Error(`${PATTERN_ENV} did not match any contract. Patterns: ${patterns.join(", ")}`);
  }

  return selected;
}

export function describeContractSelection(total: number, selected: number): string {
  const pattern = process.env[PATTERN_ENV];
  if (!pattern) {
    return `Running ${selected} contract(s).`;
  }

  return `Running ${selected} of ${total} contract(s) matching ${PATTERN_ENV}=${JSON.stringify(pattern)}.`;
}
