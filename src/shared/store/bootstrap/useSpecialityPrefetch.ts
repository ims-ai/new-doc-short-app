import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

import { prefetchSpeciality } from "@/modules/Quote/api/specialityApi";

/**
 * Home Page boot prefetch: when the app is opened on `/`, start
 * `GET /auth/speciality/{code}` right away — in parallel with session restore,
 * not behind FlowLayout's boot loader — so the landing hero and "Get estimate"
 * are ready as soon as the page paints. `LandingView`'s `useSpeciality()`
 * attaches to this in-flight request (one call).
 *
 * Any other entry path leaves the fetch to its first consumer
 * (`ensureSpeciality` / `useSpeciality`) — see `specialityApi.ts`.
 */
export function useSpecialityPrefetch(): void {
  const { pathname } = useLocation();
  const bootPathRef = useRef(pathname);

  useEffect(() => {
    if (bootPathRef.current !== "/") return;
    void prefetchSpeciality();
  }, []);
}
