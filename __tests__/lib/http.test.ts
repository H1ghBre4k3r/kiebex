import { describe, expect, it } from "@jest/globals";
import { jsonError, jsonOk } from "@/lib/http";

describe("http response helpers", () => {
  it("builds stable success envelope", async () => {
    const response = jsonOk({ hello: "world" }, { status: 201 });
    const body = (await response.json()) as {
      status: string;
      data: { hello: string };
    };

    expect(response.status).toBe(201);
    expect(body).toEqual({
      status: "ok",
      data: { hello: "world" },
    });
  });

  it("builds stable error envelope with details", async () => {
    const response = jsonError(400, "INVALID_QUERY", "Validation failed.", [
      { path: "sizeMl", message: "Too small" },
    ]);
    const body = (await response.json()) as {
      status: string;
      error: { code: string; message: string; details?: Array<{ path?: string; message: string }> };
    };

    expect(response.status).toBe(400);
    expect(body).toEqual({
      status: "error",
      error: {
        code: "INVALID_QUERY",
        message: "Validation failed.",
        details: [{ path: "sizeMl", message: "Too small" }],
      },
    });
  });
});
