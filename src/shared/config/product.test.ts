import { describe, expect, it } from "vitest";
import { PRODUCT } from "@/shared/config/product";

describe("PRODUCT — the one place the speciality code lives", () => {
  it("names a non-empty, trimmed speciality code", () => {
    expect(typeof PRODUCT.specialityCode).toBe("string");
    expect(PRODUCT.specialityCode.length).toBeGreaterThan(0);
    expect(PRODUCT.specialityCode).toBe(PRODUCT.specialityCode.trim());
  });

  it("is frozen, so nothing can swap the product at runtime", () => {
    expect(Object.isFrozen(PRODUCT)).toBe(true);
  });
});
