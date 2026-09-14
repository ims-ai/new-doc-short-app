import { afterEach, describe, expect, it, vi } from "vitest";

// The speciality master record must be fetched ONCE per page load, however
// many consumers ask — boot prefetch, the landing hero, pricing, the
// question tree, the rail. These pin that contract against the real
// singleton QueryClient the app uses.

const get = vi.fn();
vi.mock("axios", () => ({
  default: { get: (...args: unknown[]) => get(...args) },
}));

// Keep the intentional 404 out of the test log; `apiUrl` still needs to work.
vi.mock("@/shared/services/config", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/services/config")>()),
  logApiError: vi.fn(),
}));

import { PRODUCT } from "@/shared/config/product";
import { apiUrl } from "@/shared/services/config";
import { queryClient } from "@/shared/query/queryClient";
import {
  ensureSpeciality,
  getSpecialitySync,
  prefetchSpeciality,
  removeAllQueriesExceptSpeciality,
  specialityQuery,
} from "@/modules/Quote/api/specialityApi";

const SPECIALITY = {
  id: 10512,
  title: "Internal Medicine",
  abbreviation: "IM",
  specialitiesCategory: "Physicians",
  description: "Focuses on adult diseases and chronic condition management.",
};

const specialityUrl = () =>
  apiUrl(`/auth/speciality/${encodeURIComponent(PRODUCT.specialityCode)}`);

afterEach(() => {
  queryClient.clear();
  get.mockReset();
});

describe("speciality — fetched once per page load", () => {
  it("is keyed by the product's code", () => {
    expect(specialityQuery().queryKey).toEqual(["speciality", PRODUCT.specialityCode]);
  });

  it("boot prefetch + concurrent and later consumers share ONE GET", async () => {
    get.mockResolvedValue({ data: SPECIALITY });

    const boot = prefetchSpeciality();
    const [a, b, c] = await Promise.all([
      ensureSpeciality(),
      ensureSpeciality(),
      ensureSpeciality(),
    ]);
    await boot;
    // Back to Home later / another page's pricing call — cache hit.
    const later = await ensureSpeciality();

    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith(specialityUrl());
    expect([a.id, b.id, c.id, later.id]).toEqual([10512, 10512, 10512, 10512]);
    expect(getSpecialitySync()?.title).toBe("Internal Medicine");
  });

  it("getSpecialitySync is null until the first fetch resolves", () => {
    expect(getSpecialitySync()).toBeNull();
  });

  it("does not retry a 404 (code wrong / not ssp-enabled / group inactive)", async () => {
    get.mockRejectedValue(
      Object.assign(new Error("Request failed with status code 404"), {
        response: { status: 404 },
      }),
    );

    await expect(ensureSpeciality()).rejects.toThrow();
    expect(get).toHaveBeenCalledTimes(1);
    expect(getSpecialitySync()).toBeNull();
  });

  it("sign-out wipes every other query but keeps the speciality", async () => {
    get.mockResolvedValue({ data: SPECIALITY });
    await ensureSpeciality();
    queryClient.setQueryData(["profile", "details"], { id: 1 });
    queryClient.setQueryData(["order", "detail", "42"], { id: 42 });

    removeAllQueriesExceptSpeciality();

    expect(queryClient.getQueryData(["profile", "details"])).toBeUndefined();
    expect(queryClient.getQueryData(["order", "detail", "42"])).toBeUndefined();
    expect(getSpecialitySync()?.id).toBe(10512);
    // sign-out → sign-in → Home: still no refetch.
    await ensureSpeciality();
    expect(get).toHaveBeenCalledTimes(1);
  });
});
