import { Link } from "react-router-dom";
import { MedMalGuardHeader } from "@/modules/Quote/components/MedMalGuardLanding";
import { btnPrimary } from "@/shared/utils/styles";

/**
 * Catch-all for unmatched paths. Same shell as `SignInPage` (MedMalGuard
 * header + centred card) with one way out: back to the Home Page calculator.
 */
export default function NotFoundPage() {
  return (
    <div className="auth-page">
      <div className="app-header">
        <MedMalGuardHeader />
      </div>

      <div
        className="auth-body"
        style={{ flex: 1, padding: "0 18px 18px", display: "flex", flexDirection: "column" }}
      >
        <div className="auth-card" style={{ textAlign: "center" }}>
          <h1
            className="ui-heading"
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: 22,
              fontWeight: 600,
              color: "#1a1a1a",
              margin: "24px 0 8px",
            }}
          >
            Page not found
          </h1>
          <p style={{ fontSize: 13, color: "#595959", lineHeight: 1.5, margin: "0 0 20px" }}>
            That page doesn&apos;t exist. Start a quote from the home page, or sign in to manage
            your policy.
          </p>
          <Link
            to="/"
            className="ui-btn-primary"
            style={{ ...btnPrimary, display: "block", textDecoration: "none" }}
          >
            Go to the home page
          </Link>
        </div>
      </div>
    </div>
  );
}
