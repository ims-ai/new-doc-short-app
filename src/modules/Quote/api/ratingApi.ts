/**
 * Rating API surface. Wires the real `ins` rating contract — every page's
 * live price reads from here (see CLAUDE.md "Real pricing, everywhere").
 *
 * Request-body params stay loosely typed (`any` / `Record<string, any>`) —
 * they are hand-built partials fed straight into the DTO constructors; the
 * value here is the fully-typed return DTOs.
 */
import axios from "axios";
import { apiUrl } from "@/shared/services/config";
import { ZIPCODE_NOT_AVAILABLE_MSG } from "@/shared/utils/misc";
import { CoverageLimitOptionResponse, QuoteFormData, QuotesRequest } from "@/shared/dtos";

// Only a message `ins` itself supplied — never axios's generic "Request failed
// with status code …", which callers would otherwise surface verbatim. Each
// caller falls back to its own friendly copy.
const getApiErrorMessage = (error: any): string | undefined =>
  error?.response?.data?.apierror?.message || error?.response?.data?.message;

/**
 * POST /auth/quotedata — fetch ILF/DLF defaults + limits for a (zip,
 * speciality, effective-date) tuple. `specialtiesMasterId` comes from
 * `specialityApi.ensureSpeciality()`, never a hard-coded id.
 */
export const postIlfDlf = async (body: any): Promise<QuoteFormData> => {
  try {
    const response = await axios.post(apiUrl("/auth/quotedata"), new QuotesRequest(body), {
      withCredentials: true,
    });
    return new QuoteFormData(response.data);
  } catch (error) {
    const message = getApiErrorMessage(error);
    if (
      String(message || "")
        .toLowerCase()
        .includes("zip code not found")
    ) {
      throw new Error(ZIPCODE_NOT_AVAILABLE_MSG);
    }
    throw new Error(message || "Could not load coverage options for this zip. Please try again.");
  }
};

/**
 * GET /auth/{zipcode}/coverage-limits — the ILF/DLF coverage-limit options
 * available for a ZIP code's state (`CoverageLimitOptionResponse[]`, each
 * `{ id, limit, isDefault }`). The Home Page "Instant estimate" card fills
 * its limit picker from this and auto-selects the `isDefault` row.
 */
export const getCoverageLimits = async (
  zipcode: string,
): Promise<CoverageLimitOptionResponse[]> => {
  try {
    const response = await axios.get(
      apiUrl(`/auth/${encodeURIComponent(zipcode)}/coverage-limits`),
      { withCredentials: true },
    );
    return Array.isArray(response.data)
      ? response.data.map((x: any) => new CoverageLimitOptionResponse(x))
      : [];
  } catch (error) {
    const message = getApiErrorMessage(error);
    throw new Error(message || "Could not load coverage limits for this zip. Please try again.");
  }
};
