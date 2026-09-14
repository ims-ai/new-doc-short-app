/**
 * The product's speciality-master record — `GET /auth/speciality/{code}` for
 * `PRODUCT.specialityCode` — fetched ONCE per page load and shared by every
 * consumer (Home hero, pricing, the question tree, snapshot rail, COI preview).
 *
 * "Once per page load":
 *  - Entry on `/`: `useSpecialityPrefetch` fires the request at boot, in
 *    parallel with session restore; `LandingView`'s `useSpeciality()` joins it.
 *  - Every later consumer — hook (`useSpeciality`), non-hook
 *    (`ensureSpeciality`) or synchronous projection (`getSpecialitySync`) —
 *    reads the same cache entry: `staleTime` / `gcTime: Infinity`, so it is
 *    never refetched or evicted while the tab lives. Concurrent first callers
 *    dedupe inside react-query.
 *  - Sign-out keeps it (`removeAllQueriesExceptSpeciality`).
 *  - A hard reload is a new page load → one new fetch (in memory by design).
 *
 * Retry is the queryClient default: ≤2 retries with backoff for 5xx/network,
 * never a 4xx. A 404 means the code is wrong, the row has `sspenable=false`,
 * or its group is inactive — the Home Page shows "temporarily unavailable".
 *
 * The request deliberately takes no AbortSignal: react-query cancels a
 * signal-consuming fetch when its last observer unmounts, and the next
 * consumer would then issue a second GET in the same page load.
 */
import axios from "axios";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { apiUrl, logApiError } from "@/shared/services/config";
import { SpecialityMasterResponse } from "@/shared/dtos";
import { PRODUCT } from "@/shared/config/product";
import { queryClient } from "@/shared/query/queryClient";
import { queryKeys } from "@/shared/query/keys";

/** Shown wherever pricing needs the speciality and it couldn't be resolved. */
export const SPECIALITY_UNAVAILABLE_MSG =
  "Online quoting is temporarily unavailable. Please try again shortly or call us.";

export const specialityQuery = () =>
  queryOptions({
    queryKey: queryKeys.speciality.current(),
    queryFn: async (): Promise<SpecialityMasterResponse> => {
      try {
        const response = await axios.get(
          apiUrl(`/auth/speciality/${encodeURIComponent(PRODUCT.specialityCode)}`),
        );
        return new SpecialityMasterResponse(response.data);
      } catch (error) {
        logApiError(error, { specialityCode: PRODUCT.specialityCode });
        throw error;
      }
    },
    // A speciality master row doesn't change mid-session.
    staleTime: Infinity,
    gcTime: Infinity,
  });

/** React consumers. */
export const useSpeciality = () => useQuery(specialityQuery());

/** Non-hook callers (pricing, submission build) — a cache hit after the first fetch. */
export const ensureSpeciality = (): Promise<SpecialityMasterResponse> =>
  queryClient.ensureQueryData(specialityQuery());

/** The Home Page boot prefetch. Never rejects (react-query swallows prefetch errors). */
export const prefetchSpeciality = (): Promise<void> => queryClient.prefetchQuery(specialityQuery());

/** Synchronous projection for non-hook readers; `null` until the first fetch resolves. */
export const getSpecialitySync = (): SpecialityMasterResponse | null =>
  queryClient.getQueryData(specialityQuery().queryKey) ?? null;

/**
 * Sign-out cache wipe: drop every server response (profile, dashboard, order,
 * questions, pricing, Stripe key) so the next user never sees the previous
 * one's data — except the speciality, which is the same for everyone.
 */
export const removeAllQueriesExceptSpeciality = (client = queryClient): void => {
  const specialityRoot = queryKeys.speciality.current()[0];
  client.removeQueries({ predicate: (q) => q.queryKey[0] !== specialityRoot });
};
