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
    assert(
      response.status === 200 || response.status === 503,
      "Expected health endpoint to return 200 (healthy) or 503 (degraded).",
    );
    assertString(response.headers["x-request-id"], "Expected X-Request-ID response header.");
    assertObject(response.body, "Expected JSON object response body.");
    assertEqual(response.body.status, "ok", "Expected ok response envelope.");

    assertObject(response.body.data, "Expected health data object.");
    assertEqual(response.body.data.service, "kiebex", "Expected service name to stay stable.");
    assert(
      response.body.data.status === "healthy" || response.body.data.status === "degraded",
      "Expected service status to be healthy or degraded.",
    );
    assert(
      (response.status === 200 && response.body.data.status === "healthy") ||
        (response.status === 503 && response.body.data.status === "degraded"),
      "Expected health HTTP status and service status to match the documented contract.",
    );
    assertIsoDateString(response.body.data.timestamp, "Expected ISO timestamp.");

    assertObject(response.body.data.checks, "Expected checks object.");
    assert(
      response.body.data.checks.database === "ok" || response.body.data.checks.database === "error",
      "Expected database check to be ok or error.",
    );
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
