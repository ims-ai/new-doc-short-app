/**
 * Tiny page-side wrappers around the document views.
 *
 * Each handler matches the shape pages were already using:
 *   handler(submissionId[, isActive], setError) → Promise<void>
 *
 * Binder/Policy are gated by `isActive` (issued policies only); the quote and
 * COI are always available. Errors go to the page's local error state via the
 * optional `setError` callback — the caller picks where the message renders.
 *
 * Each handler delegates to `paymentApi.js`'s real binary document download
 * (`GET /documents/{id}/{kind}/download`) — no local/specimen fallback.
 */
import {
  downloadBinderPdf,
  downloadCOIPdf,
  downloadInvoicePdf,
  downloadPaymentReceiptPdf,
  downloadPolicyPdf,
  downloadQuotePdf,
  downloadSignedPdf,
} from "@/modules/Payment/api/paymentApi";

/** Real certificate of insurance — GET /documents/{id}/insured-certificate/download. */
export async function downloadCOI(submissionId: number | string, setError?: (msg: string) => void) {
  try {
    await downloadCOIPdf(submissionId);
  } catch (e: any) {
    setError?.(e?.message || "Could not open the certificate");
  }
}

export async function downloadQuote(
  submissionId: number | string,
  setError?: (msg: string) => void,
) {
  try {
    await downloadQuotePdf(submissionId);
  } catch (e: any) {
    setError?.(e?.message || "Could not open the quote");
  }
}

export async function downloadBinder(
  submissionId: number | string,
  isActive: boolean,
  setError?: (msg: string) => void,
) {
  if (!isActive) return;
  try {
    await downloadBinderPdf(submissionId);
  } catch (e: any) {
    setError?.(e?.message || "Could not open the binder");
  }
}

export async function downloadInvoice(
  submissionId: number | string,
  isActive: boolean,
  setError?: (msg: string) => void,
) {
  if (!isActive) return;
  try {
    await downloadInvoicePdf(submissionId);
  } catch (e: any) {
    setError?.(e?.message || "Could not open the invoice");
  }
}

/**
 * Signed DocuSign document — GET /documents/{id}/signed/download. Not gated
 * client-side: `ins` knows whether the envelope is signed and answers 409
 * until it is, which maps to a friendly "not available yet".
 */
export async function downloadSigned(
  submissionId: number | string,
  setError?: (msg: string) => void,
) {
  try {
    await downloadSignedPdf(submissionId);
  } catch (e: any) {
    setError?.(
      e?.response?.status === 409
        ? "Your signed document isn't available yet — it appears once you've signed your application."
        : "Could not download the signed document. Please try again.",
    );
  }
}

/**
 * Payment receipt — GET /documents/{id}/payment-receipt/download. Not gated
 * client-side: `ins` generates it on first request once payment has
 * succeeded and answers 404 (no payment yet) / 409 (payment not settled),
 * which map to friendly messages here (same shape as `downloadSigned`).
 */
export async function downloadPaymentReceipt(
  submissionId: number | string,
  setError?: (msg: string) => void,
) {
  try {
    await downloadPaymentReceiptPdf(submissionId);
  } catch (e: any) {
    const status = e?.response?.status;
    setError?.(
      status === 404
        ? "Your payment receipt isn't available yet — it appears once a payment has been made."
        : status === 409
          ? "Your payment receipt isn't available yet — the payment hasn't settled."
          : "Could not download the payment receipt. Please try again.",
    );
  }
}

/** Full policy document — GET /documents/{id}/policy/download (issued policies only). */
export async function downloadPolicy(
  submissionId: number | string,
  isActive: boolean,
  setError?: (msg: string) => void,
) {
  if (!isActive) return;
  try {
    await downloadPolicyPdf(submissionId);
  } catch (e: any) {
    setError?.(e?.message || "Could not open the policy");
  }
}
