import { describe, expect, it } from "@jest/globals";
import {
  toRawMap,
  rawMapToUrl,
  removeOneValue,
  toggleValue,
  toggleVariantGroup,
  setSort,
  buildPaginationUrl,
} from "@/lib/beer-directory-url";

describe("toRawMap", () => {
  it("converts string values to single-element arrays", () => {
    expect(toRawMap({ sort: "price_desc" })).toEqual({ sort: ["price_desc"] });
  });

  it("converts string arrays, filtering out empty strings", () => {
    expect(toRawMap({ brandId: ["b-1", "", "b-2"] })).toEqual({
      brandId: ["b-1", "b-2"],
    });
  });

  it("drops keys whose only values are empty strings", () => {
    expect(toRawMap({ brandId: ["", ""] })).toEqual({});
  });

  it("drops undefined values", () => {
    expect(toRawMap({ brandId: undefined, sort: "price_asc" })).toEqual({
      sort: ["price_asc"],
    });
  });
});

describe("rawMapToUrl", () => {
  it("returns / for an empty map", () => {
    expect(rawMapToUrl({})).toBe("/");
  });

  it("serializes a single value", () => {
    expect(rawMapToUrl({ sort: ["price_desc"] })).toBe("/?sort=price_desc");
  });

  it("serializes multiple values for the same key", () => {
    const url = rawMapToUrl({ brandId: ["b-1", "b-2"] });
    expect(url).toBe("/?brandId=b-1&brandId=b-2");
  });
});

describe("removeOneValue", () => {
  it("removes a value that is present", () => {
    const map = { brandId: ["b-1", "b-2"] };
    expect(removeOneValue(map, "brandId", "b-1")).toEqual({ brandId: ["b-2"] });
  });

  it("deletes the key when the last value is removed", () => {
    const map = { brandId: ["b-1"] };
    expect(removeOneValue(map, "brandId", "b-1")).toEqual({});
  });

  it("is a no-op when the value is absent", () => {
    const map = { brandId: ["b-1"] };
    expect(removeOneValue(map, "brandId", "b-99")).toEqual({ brandId: ["b-1"] });
  });

  it("does not drop page (preserves it for chip removal)", () => {
    const map = { brandId: ["b-1"], page: ["2"] };
    expect(removeOneValue(map, "brandId", "b-1")).toEqual({ page: ["2"] });
  });
});

describe("toggleValue", () => {
  it("adds a value that is not yet present", () => {
    const result = toggleValue({ brandId: ["b-1"] }, "brandId", "b-2");
    expect(result.brandId).toEqual(["b-1", "b-2"]);
  });

  it("removes a value that is already present", () => {
    const result = toggleValue({ brandId: ["b-1", "b-2"] }, "brandId", "b-1");
    expect(result.brandId).toEqual(["b-2"]);
  });

  it("deletes the key when the last value is toggled off", () => {
    const result = toggleValue({ brandId: ["b-1"] }, "brandId", "b-1");
    expect(result.brandId).toBeUndefined();
  });

  it("drops page on every toggle", () => {
    const map = { brandId: ["b-1"], page: ["3"] };
    const result = toggleValue(map, "brandId", "b-2");
    expect(result.page).toBeUndefined();
  });

  it("preserves unrelated keys", () => {
    const map = { sort: ["price_desc"], sizeMl: ["500"] };
    const result = toggleValue(map, "sizeMl", "330");
    expect(result.sort).toEqual(["price_desc"]);
    expect(result.sizeMl).toEqual(["500", "330"]);
  });
});

describe("toggleVariantGroup", () => {
  it("adds all group IDs when none are selected", () => {
    const result = toggleVariantGroup({ variantId: ["v-other"] }, ["v-1", "v-2"]);
    expect(result.variantId).toEqual(expect.arrayContaining(["v-other", "v-1", "v-2"]));
  });

  it("removes all group IDs when any is selected", () => {
    const result = toggleVariantGroup({ variantId: ["v-1", "v-other"] }, ["v-1", "v-2"]);
    expect(result.variantId).toEqual(["v-other"]);
  });

  it("deletes variantId when all IDs are removed", () => {
    const result = toggleVariantGroup({ variantId: ["v-1"] }, ["v-1"]);
    expect(result.variantId).toBeUndefined();
  });

  it("drops page", () => {
    const map = { variantId: ["v-1"], page: ["2"] };
    const result = toggleVariantGroup(map, ["v-1"]);
    expect(result.page).toBeUndefined();
  });
});

describe("setSort", () => {
  it("sets a non-default sort value", () => {
    const result = setSort({}, "price_desc");
    expect(result.sort).toEqual(["price_desc"]);
  });

  it("omits sort key for the default value (price_asc)", () => {
    const result = setSort({ sort: ["price_desc"] }, "price_asc");
    expect(result.sort).toBeUndefined();
  });

  it("replaces an existing sort value", () => {
    const result = setSort({ sort: ["name_asc"] }, "price_desc");
    expect(result.sort).toEqual(["price_desc"]);
  });

  it("drops page", () => {
    const result = setSort({ page: ["2"] }, "price_desc");
    expect(result.page).toBeUndefined();
  });

  it("preserves filter keys", () => {
    const result = setSort({ brandId: ["b-1"], sort: ["name_asc"] }, "price_desc");
    expect(result.brandId).toEqual(["b-1"]);
  });
});

describe("buildPaginationUrl", () => {
  it("omits page param on page 1", () => {
    const url = buildPaginationUrl({ sort: "price_desc" }, 1);
    expect(url).toBe("/?sort=price_desc");
    expect(url).not.toContain("page");
  });

  it("includes page param for pages > 1", () => {
    const url = buildPaginationUrl({ sort: "price_desc" }, 3);
    expect(url).toContain("page=3");
    expect(url).toContain("sort=price_desc");
  });

  it("replaces an existing page param", () => {
    const url = buildPaginationUrl({ sort: "price_desc", page: "2" }, 4);
    expect(url).toContain("page=4");
    expect(url).not.toMatch(/page=2/);
  });

  it("returns / for page 1 with no other params", () => {
    expect(buildPaginationUrl({}, 1)).toBe("/");
  });
});
