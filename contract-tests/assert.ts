import { inspect } from "node:util";

export function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

export function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (!Object.is(actual, expected)) {
    throw new Error(
      `${message}\nExpected: ${inspect(expected, { depth: null })}\nActual: ${inspect(actual, { depth: null })}`,
    );
  }
}

export function assertDeepEqual(actual: unknown, expected: unknown, message: string): void {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);

  if (actualJson !== expectedJson) {
    throw new Error(
      `${message}\nExpected: ${inspect(expected, { depth: null })}\nActual: ${inspect(actual, { depth: null })}`,
    );
  }
}

export function assertObject(
  value: unknown,
  message: string,
): asserts value is Record<string, unknown> {
  assert(value !== null && typeof value === "object" && !Array.isArray(value), message);
}

export function assertString(value: unknown, message: string): asserts value is string {
  assert(typeof value === "string", message);
}

export function assertIsoDateString(value: unknown, message: string): asserts value is string {
  assertString(value, message);
  assert(!Number.isNaN(Date.parse(value)), message);
}
