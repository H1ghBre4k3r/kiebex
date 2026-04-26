import { assert, assertEqual, assertIsoDateString, assertObject, assertString } from "../assert";
import { normalizeHeaders, replaceJsonPath } from "../normalize";
import type { ContractCase, ContractResponse } from "../types";

export const healthContract: ContractCase = {
  name: "GET /api/v1/health returns the stable health envelope",
  request: {
    method: "GET",
    path: "/api/v1/health",
  },
  assert(response) {
    assertEqual(response.status, 200, "Expected health endpoint to return 200.");
    assertString(response.headers["x-request-id"], "Expected X-Request-ID response header.");
    assertObject(response.body, "Expected JSON object response body.");
    assertEqual(response.body.status, "ok", "Expected ok response envelope.");

    assertObject(response.body.data, "Expected health data object.");
    assertEqual(response.body.data.service, "kiebex", "Expected service name to stay stable.");
    assertEqual(response.body.data.status, "healthy", "Expected healthy service status.");
    assertIsoDateString(response.body.data.timestamp, "Expected ISO timestamp.");

    assertObject(response.body.data.checks, "Expected checks object.");
    assertEqual(response.body.data.checks.database, "ok", "Expected healthy database check.");
  },
  normalize(response) {
    let normalized: ContractResponse = normalizeHeaders(response, [
      "date",
      "connection",
      "keep-alive",
      "transfer-encoding",
      "x-request-id",
    ]);

    normalized = {
      ...normalized,
      body: replaceJsonPath(normalized.body, ["data", "timestamp"], "<timestamp>"),
    };

    assert(
      normalized.body !== undefined,
      "Expected normalized response body to remain available after timestamp replacement.",
    );

    return normalized;
  },
};
