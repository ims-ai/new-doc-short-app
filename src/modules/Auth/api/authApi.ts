/**
 * Auth API surface. Talks to INS-SERVICE for real.
 */
import axios from "axios";
import { apiUrl, logApiError } from "@/shared/services/config";
import { getJson } from "@/shared/services/http";
import {
  GoogleDataResponse,
  GoogleTokenRequest,
  GoogleTokenResponse,
  InsuredAuthSessionResponse,
  InsuredAuthToken,
  InsuredLoginRequest,
} from "@/shared/dtos";

/**
 * Non-HttpOnly "auth hint" cookie. The access token itself is HttpOnly so JS
 * can't see it — this hint just tells the JS side whether to bother calling
 * `/insured/session` on boot. Setting it does NOT grant auth (the HttpOnly
 * token still does); clearing it does NOT sign the user out (the backend
 * cookie remains until logout).
 *
 * Must be a **persistent** cookie (`Max-Age`), not a session cookie: the
 * real access/refresh cookies the backend sets carry `Max-Age` (`ins`
 * `AuthCookieHelper`) and survive closing the browser. A session-only hint
 * cookie would not, so the next launch would skip `/insured/session`
 * entirely and the user would be bounced to sign-in despite still having a
 * valid backend session. `maxAgeSeconds` should be the response's
 * `refreshTokenExpirationTime` so the hint tracks the real refresh-token
 * lifetime (including the sliding window on every silent refresh); the
 * fallback below only covers a response that omits it.
 */
const AUTH_HINT = "q2b_auth";
/** Matches `ins`'s `security.refreshTokenValidity` default (15 days). */
const AUTH_HINT_FALLBACK_MAX_AGE_SECONDS = 1_296_000;

export const setAuthHint = (maxAgeSeconds?: number): void => {
  try {
    const maxAge =
      typeof maxAgeSeconds === "number" && maxAgeSeconds > 0
        ? Math.floor(maxAgeSeconds)
        : AUTH_HINT_FALLBACK_MAX_AGE_SECONDS;
    document.cookie = `${AUTH_HINT}=1; path=/; max-age=${maxAge}; SameSite=Lax`;
  } catch {
    /* */
  }
};

export const clearAuthHint = (): void => {
  try {
    document.cookie = `${AUTH_HINT}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  } catch {
    /* */
  }
};

export const hasAuthHint = (): boolean => {
  try {
    return document.cookie.split(";").some((c) => c.trim().startsWith(`${AUTH_HINT}=`));
  } catch {
    return false;
  }
};

/** POST /auth/sign-in — password sign-in. */
export const postSignIn = async (
  username: string,
  password: string,
): Promise<InsuredAuthSessionResponse> => {
  try {
    const response = await axios.post(
      apiUrl("/auth/sign-in"),
      new InsuredLoginRequest({ username: username.trim(), password }),
      { withCredentials: true },
    );
    const session = new InsuredAuthSessionResponse(response.data);
    setAuthHint(session.refreshTokenExpirationTime);
    return session;
  } catch (error) {
    logApiError(error);
    throw error;
  }
};

/**
 * POST /auth/sign-in-with-google — exchange a Google ID token for a session.
 * @param idToken the credential from Google Identity Services
 */
export const postSignInWithGoogle = async (
  idToken: string,
): Promise<InsuredAuthSessionResponse> => {
  try {
    const response = await axios.post(
      apiUrl("/auth/sign-in-with-google"),
      new GoogleTokenRequest({ googletoken: idToken }),
      { withCredentials: true },
    );
    const session = new InsuredAuthSessionResponse(response.data);
    setAuthHint(session.refreshTokenExpirationTime);
    return session;
  } catch (error) {
    logApiError(error);
    throw error;
  }
};

/**
 * POST /auth/sign-in-with-googledata — the name and email on a Google
 * identity, for prefilling Register. Mints no session and touches no
 * account.
 * @param idToken the credential from Google Identity Services
 */
export const postSignInWithGoogleData = async (idToken: string): Promise<GoogleDataResponse> => {
  try {
    const response = await axios.post(
      apiUrl("/auth/sign-in-with-googledata"),
      new GoogleTokenRequest({ googletoken: idToken }),
      { withCredentials: true },
    );
    return new GoogleDataResponse(response.data);
  } catch (error) {
    logApiError(error);
    throw error;
  }
};

/**
 * POST /auth/signup — register a new insured. Does not open a submission —
 * `RegistrationPage` calls `quoteApi.postInsuredSubmission` separately.
 */
export const postInsuredSignup = async (payload: unknown): Promise<InsuredAuthToken> => {
  try {
    const response = await axios.post(apiUrl("/auth/signup"), payload, { withCredentials: true });
    const token = new InsuredAuthToken(response.data);
    setAuthHint(token.refreshTokenExpirationTime);
    return token;
  } catch (error) {
    logApiError(error);
    throw error;
  }
};

export const postLogout = async (): Promise<boolean> => {
  try {
    await axios.post(apiUrl("/auth/refresh/logout"), null, { withCredentials: true });
    clearAuthHint();
    return true;
  } catch (error) {
    clearAuthHint();
    logApiError(error);
    return false;
  }
};

/** GET /insured/session — restore session from cookies. */
export const fetchInsuredSession = async ({
  signal,
}: { signal?: AbortSignal } = {}): Promise<InsuredAuthSessionResponse | null> => {
  try {
    const response = await axios.get(apiUrl("/insured/session"), { withCredentials: true, signal });
    return response.data ? new InsuredAuthSessionResponse(response.data) : null;
  } catch (error: any) {
    // Aborted by the caller (unmount / dependency change) — propagate so the
    // caller's AbortError/CanceledError handling can distinguish it from a
    // real "not signed in" result rather than silently seeing `null`.
    if (axios.isCancel?.(error) || error?.name === "CanceledError" || error?.name === "AbortError")
      throw error;
    // 401/403/404 here just means "not signed in" — expected on first load.
    const status = error?.response?.status;
    if (status === 401 || status === 403 || status === 404) return null;
    logApiError(error);
    return null;
  }
};

/**
 * The Google OAuth client id, which the Google Identity Services script needs
 * before it can render a button. Returns an empty `clientId` rather than
 * throwing when the service has Google sign-in unconfigured — a caller that
 * only checks `clientId` then degrades to "Google sign-in unavailable"
 * instead of showing an error on a page where nothing is wrong yet.
 */
export const fetchGoogleClientId = async (): Promise<GoogleTokenResponse> => {
  try {
    return new GoogleTokenResponse(await getJson("/auth/google-client-id"));
  } catch (error) {
    logApiError(error);
    return new GoogleTokenResponse({ clientId: "" });
  }
};
