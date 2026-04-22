import { describe, expect, it } from "@jest/globals";
import {
  editAdminVariantBodySchema,
  editModerationLocationBodySchema,
  editModerationReviewBodySchema,
  parseBeerQueryParams,
  parseBeerQueryRecord,
  parseReviewQueryParams,
  updateProfileBodySchema,
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

    expect(parsed.data.brandId).toEqual(["brand-1", "brand-2"]);
    expect(parsed.data.sizeMl).toEqual([500]);
    expect(parsed.data.serving).toEqual(["tap"]);
    expect(parsed.data.locationType).toEqual(["pub"]);
    expect(parsed.data.locationId).toEqual(["loc-1"]);
  });

  it("picks the first element when sort is supplied as an array", () => {
    const parsed = parseBeerQueryRecord({ sort: ["price_desc", "name_asc"] });

    expect(parsed.success).toBe(true);

    if (!parsed.success) {
      throw new Error("Expected beer query to parse.");
    }

    expect(parsed.data.sort).toBe("price_desc");
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
    expect(issuePaths).toEqual(expect.arrayContaining(["sizeMl.0", "serving.0"]));
  });

  it("compacts blank URL params into undefined optional fields", () => {
    const parsed = parseBeerQueryParams(new URLSearchParams("brandId=%20%20&locationId=loc-9"));

    expect(parsed.success).toBe(true);

    if (!parsed.success) {
      throw new Error("Expected beer URL params to parse.");
    }

    expect(parsed.data.brandId).toBeUndefined();
    expect(parsed.data.locationId).toEqual(["loc-9"]);
  });

  it("requires locationId for review query params", () => {
    const parsed = parseReviewQueryParams(new URLSearchParams("locationId=%20%20"));

    expect(parsed.success).toBe(false);
  });
});

describe("updateProfileBodySchema", () => {
  it("rejects when neither displayName nor newPassword is provided", () => {
    const result = updateProfileBodySchema.safeParse({});

    expect(result.success).toBe(false);

    if (result.success) {
      throw new Error("Expected schema to reject empty update.");
    }

    const messages = result.error.issues.map((i) => i.message);
    expect(messages).toContain("At least one field to update is required.");
  });

  it("rejects when newPassword is provided without currentPassword", () => {
    const result = updateProfileBodySchema.safeParse({
      newPassword: "Secret123",
    });

    expect(result.success).toBe(false);

    if (result.success) {
      throw new Error("Expected schema to reject missing currentPassword.");
    }

    const paths = result.error.issues.map((i) => i.path.join("."));
    expect(paths).toContain("currentPassword");
  });

  it("accepts a valid displayName-only update", () => {
    const result = updateProfileBodySchema.safeParse({ displayName: "Alice" });
    expect(result.success).toBe(true);
  });

  it("accepts a valid password change with both password fields", () => {
    const result = updateProfileBodySchema.safeParse({
      currentPassword: "oldpass",
      newPassword: "NewPass1",
    });
    expect(result.success).toBe(true);
  });
});

describe("editModerationLocationBodySchema", () => {
  it("rejects when no fields are provided", () => {
    const result = editModerationLocationBodySchema.safeParse({});
    expect(result.success).toBe(false);
    if (result.success) throw new Error("Expected rejection.");
    expect(result.error.issues[0].message).toBe("At least one field to update is required.");
  });

  it("accepts when at least one field is provided", () => {
    const result = editModerationLocationBodySchema.safeParse({ name: "New Name" });
    expect(result.success).toBe(true);
  });
});

describe("editAdminVariantBodySchema", () => {
  it("rejects when no fields are provided", () => {
    const result = editAdminVariantBodySchema.safeParse({});
    expect(result.success).toBe(false);
    if (result.success) throw new Error("Expected rejection.");
    expect(result.error.issues[0].message).toBe("At least one field to update is required.");
  });

  it("accepts when at least one field is provided", () => {
    const result = editAdminVariantBodySchema.safeParse({ name: "Lager Extra" });
    expect(result.success).toBe(true);
  });
});

describe("editModerationReviewBodySchema", () => {
  it("rejects when no fields are provided", () => {
    const result = editModerationReviewBodySchema.safeParse({});
    expect(result.success).toBe(false);
    if (result.success) throw new Error("Expected rejection.");
    expect(result.error.issues[0].message).toBe("At least one field to update is required.");
  });

  it("accepts when at least one field is provided", () => {
    const result = editModerationReviewBodySchema.safeParse({ rating: 4 });
    expect(result.success).toBe(true);
  });
});
