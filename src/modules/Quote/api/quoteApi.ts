/**
 * Submission API surface. Talks to INS-SERVICE for real — no local fallback.
 *
 * `ins` validates `speciality`/`zipcode`/`coverageilfdlfid` server-side
 * against its own rate/speciality-group data before it will create a
 * submission — which is why `buildSubmissionRequest` reads every one of them
 * from the real `POST /auth/quotedata` response.
 */
import axios from "axios";
import { apiUrl, logApiError } from "@/shared/services/config";
import { OpenOrderDetailsDto, OrderDetailsResponse, PolicyInfoResponse } from "@/shared/dtos";
import { UpdateRatingRequest, RatingResponseDTO } from "@/shared/dtos/rating.dto";

// In-flight `POST /insured/submission` promises, keyed by the rating-
// identifying fields of the payload. `RegistrationPage` has two independent
// paths that can each fire a create for the same quote in the same tick (the
// "Create account" handler and the "already signed in" effect, once the
// handler sets `insuredProfile` and flips `isAuthenticated`). Sharing one
// promise here means the backend only ever sees a single POST per quote,
// regardless of how the callers race. Entries clear as soon as the request
// settles — this dedupes concurrency, not a completed create (that is the
// caller's `flowSubmissionId` idempotency guard).
const inflightSubmissionByKey = new Map<string, Promise<OpenOrderDetailsDto>>();

const submissionDedupeKey = (payload: any): string =>
  [
    payload?.zipcode,
    payload?.effectiveDate,
    payload?.retroDate,
    payload?.coverageilfdlfid,
    payload?.speciality,
    payload?.year,
    payload?.hoursperweek,
  ].join("|");

/**
 * POST /insured/submission — create a submission for an authenticated
 * insured, per the real `InsuredOrderRequest` contract (see
 * `Quote/utils/submission.js`'s `buildSubmissionRequest`).
 *
 * Concurrent identical creates share one request (see
 * `inflightSubmissionByKey` above) so a single "Create account" click can
 * never open two submissions for the same insured.
 */
export const postInsuredSubmission = async (payload: any): Promise<OpenOrderDetailsDto> => {
  const key = submissionDedupeKey(payload);
  const inflight = inflightSubmissionByKey.get(key);
  if (inflight) return inflight;

  const p = (async () => {
    try {
      const response = await axios.post(apiUrl("/insured/submission"), payload, {
        withCredentials: true,
      });
      return new OpenOrderDetailsDto(response.data);
    } catch (error) {
      logApiError(error);
      throw error;
    } finally {
      inflightSubmissionByKey.delete(key);
    }
  })();
  inflightSubmissionByKey.set(key, p);
  return p;
};

/** GET /insured/order?submissionid= — full order details for a submission. */
export const fetchInsuredOrderDetails = async (
  submissionId: number | string,
): Promise<OrderDetailsResponse | null> => {
  try {
    const response = await axios.get(apiUrl("/insured/order"), {
      params: { submissionid: String(submissionId) },
      withCredentials: true,
    });
    return response.data ? new OrderDetailsResponse(response.data) : null;
  } catch (error) {
    logApiError(error);
    throw error;
  }
};

export const fetchPolicyInfo = async (
  submissionId: number | string,
): Promise<PolicyInfoResponse | null> => {
  try {
    const response = await axios.get(apiUrl("/insured/policy-info"), {
      params: { submissionid: String(submissionId) },
      withCredentials: true,
    });
    return response.data ? new PolicyInfoResponse(response.data) : null;
  } catch (error) {
    logApiError(error);
    throw error;
  }
};

/**
 * PUT /insured/rating — re-price an existing submission after a rating
 * input (effective date, limit tier, etc.) changes.
 *
 * `UpdateRatingRequest` is a full-replace payload, not a patch — `ins`
 * validates the submission, an EXISTING rating id (`singleRatingId`),
 * zipcode, speciality, and ILF/DLF limits together and rejects a partial
 * body. `changes` should therefore carry the complete current rating
 * context (built from `ilfDlfStore.current` + practice inputs), not just
 * the one field that changed — callers merge their delta onto that first.
 *
 * `singleRatingId` and `retroilfdlfid` have no available source in this
 * app yet: `singleRatingId` is a real rating row id `ins` assigns when the
 * submission is first created (not currently surfaced back to the client
 * anywhere in `OpenOrderDetailsDto`/`OrderDetailsResponse`), and
 * `retroilfdlfid` needs a resolved retro/claims-made ILF/DLF row this app
 * never fetches. Both default to `0`, which `ins` will reject — this call
 * cannot be considered correctly exercisable until those are sourced, flag
 * it rather than guessing a value.
 */
export const putSubmissionRatingInputs = async (
  submissionId: number | string,
  changes: any,
): Promise<RatingResponseDTO> => {
  try {
    const response = await axios.put(
      apiUrl("/insured/rating"),
      new UpdateRatingRequest({ ...changes, submissionId: Number(submissionId) }),
      { withCredentials: true },
    );
    return new RatingResponseDTO(response.data);
  } catch (error) {
    logApiError(error);
    throw error;
  }
};
