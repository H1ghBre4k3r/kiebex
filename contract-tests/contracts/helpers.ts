import { assert, assertEqual, assertIsoDateString, assertObject, assertString } from "../assert";
import type { ContractCase, ContractRequest, ContractResponse } from "../types";

type JsonObject = Record<string, unknown>;

export function assertJsonOk(response: ContractResponse, expectedStatus = 200): JsonObject {
  assertEqual(response.status, expectedStatus, `Expected HTTP ${expectedStatus}.`);
  assertObject(response.body, "Expected JSON object response body.");
  assertEqual(response.body.status, "ok", "Expected ok response envelope.");
  assertObject(response.body.data, "Expected ok envelope data object.");

  return response.body.data;
}

export function assertJsonError(
  response: ContractResponse,
  expectedStatus: number,
  expectedCode: string,
): JsonObject {
  assertEqual(response.status, expectedStatus, `Expected HTTP ${expectedStatus}.`);
  assertObject(response.body, "Expected JSON object response body.");
  assertEqual(response.body.status, "error", "Expected error response envelope.");
  assertObject(response.body.error, "Expected error envelope object.");
  assertEqual(response.body.error.code, expectedCode, `Expected ${expectedCode} error code.`);
  assertString(response.body.error.message, "Expected stable error message string.");

  return response.body.error;
}

export function assertJsonErrorOneOf(
  response: ContractResponse,
  expected: Array<{ status: number; code: string }>,
): JsonObject {
  assertObject(response.body, "Expected JSON object response body.");
  const body = response.body;
  assertEqual(body.status, "error", "Expected error response envelope.");
  assertObject(body.error, "Expected error envelope object.");
  const error = body.error;

  const matched = expected.some(
    (entry) => response.status === entry.status && error.code === entry.code,
  );

  assert(
    matched,
    `Expected one of ${expected.map((entry) => `${entry.status} ${entry.code}`).join(", ")}; got ${response.status} ${String(error.code)}.`,
  );

  assertString(error.message, "Expected stable error message string.");

  return error;
}

export function assertValidationDetails(error: JsonObject): void {
  if (error.details === undefined) {
    return;
  }

  assert(Array.isArray(error.details), "Expected validation details to be an array when present.");

  for (const detail of error.details) {
    assertObject(detail, "Expected validation detail object.");
    assertString(detail.message, "Expected validation detail message string.");
    if (detail.path !== undefined) {
      assertString(detail.path, "Expected validation detail path string when present.");
    }
  }
}

export function assertIsoStringField(value: JsonObject, field: string): void {
  assertIsoDateString(value[field], `Expected ${field} to be an ISO date string.`);
}

export function assertArrayField(value: JsonObject, field: string): unknown[] {
  assert(Array.isArray(value[field]), `Expected ${field} to be an array.`);
  return value[field];
}

export function publicOkContract(
  name: string,
  request: ContractRequest,
  assertData: (data: JsonObject, response: ContractResponse) => void,
): ContractCase {
  return {
    name,
    request,
    assert(response) {
      const data = assertJsonOk(response);
      assertData(data, response);
    },
  };
}

export function invalidBodyContract(
  name: string,
  request: Omit<ContractRequest, "body">,
): ContractCase {
  return {
    name,
    request: {
      ...request,
      headers: { "content-type": "application/json", ...request.headers },
      body: {},
    },
    assert(response) {
      const error = assertJsonError(response, 400, "INVALID_BODY");
      assertValidationDetails(error);
    },
  };
}

export function invalidJsonContract(name: string, request: ContractRequest): ContractCase {
  return {
    name,
    request: {
      ...request,
      headers: { "content-type": "application/json", ...request.headers },
      body: "__RAW_INVALID_JSON__",
    },
    assert(response) {
      assertJsonError(response, 400, "INVALID_JSON");
    },
  };
}

export function unauthorizedContract(name: string, request: ContractRequest): ContractCase {
  return {
    name,
    request,
    assert(response) {
      assertJsonError(response, 401, "UNAUTHORIZED");
    },
  };
}
