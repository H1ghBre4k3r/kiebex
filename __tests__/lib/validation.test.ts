import { describe, expect, it } from "@jest/globals";
import {
  parseBeerQueryParams,
  parseBeerQueryRecord,
  parseReviewQueryParams,
} from "@/lib/validation";

describe("validation query parsing", () => {
  it("parses and normalizes beer query records", () => {
    const parsed = parseBeerQueryRecord({
      brandId: ["  brand-1  ", "brand-2"],
      sizeMl: "500",
      serving: "tap",
      locationType: "pub",
      locationId: " loc-1 ",
    });

    expect(parsed.success).toBe(true);

    if (!parsed.success) {
      throw new Error("Expected beer query to parse.");
    }

    expect(parsed.data.brandId).toBe("brand-1");
    expect(parsed.data.sizeMl).toBe(500);
    expect(parsed.data.serving).toBe("tap");
    expect(parsed.data.locationType).toBe("pub");
    expect(parsed.data.locationId).toBe("loc-1");
  });

  it("rejects invalid beer query values", () => {
    const parsed = parseBeerQueryRecord({
      sizeMl: "-50",
      serving: "draft",
    });

    expect(parsed.success).toBe(false);

    if (parsed.success) {
      throw new Error("Expected beer query parse to fail.");
    }

    const issuePaths = parsed.error.issues.map((issue) => issue.path.join("."));
    expect(issuePaths).toEqual(expect.arrayContaining(["sizeMl", "serving"]));
  });

  it("compacts blank URL params into undefined optional fields", () => {
    const parsed = parseBeerQueryParams(new URLSearchParams("brandId=%20%20&locationId=loc-9"));

    expect(parsed.success).toBe(true);

    if (!parsed.success) {
      throw new Error("Expected beer URL params to parse.");
    }

    expect(parsed.data.brandId).toBeUndefined();
    expect(parsed.data.locationId).toBe("loc-9");
  });

  it("requires locationId for review query params", () => {
    const parsed = parseReviewQueryParams(new URLSearchParams("locationId=%20%20"));

    expect(parsed.success).toBe(false);
  });
});
