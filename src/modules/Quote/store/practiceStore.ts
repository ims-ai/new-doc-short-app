import { PRODUCT } from "@/shared/config/product";

/**
 * The two practice inputs that drive pricing, both entered on the Home Page
 * calculator (step 0): the practice ZIP and the coverage effective date.
 *
 * The speciality is fixed per build (`PRODUCT.specialityCode`), so unlike
 * Q2BNursing there is no designation / speciality selection to hold here.
 *
 * Mirrored to `sessionStorage` (not `localStorage`) so a refresh mid-wizard
 * keeps the user's place, but the values go away with the tab.
 */

const SS_PREFIX = `${PRODUCT.storagePrefix}practice:`;
const KEYS = Object.freeze({
  ZIP: `${SS_PREFIX}zip`,
  EFFECTIVE_DATE: `${SS_PREFIX}effectiveDate`,
});

const readSession = (key: string): string | null => {
  try {
    return typeof sessionStorage !== "undefined" ? sessionStorage.getItem(key) : null;
  } catch {
    return null;
  }
};
const writeSession = (key: string, value: string | null | undefined) => {
  try {
    if (typeof sessionStorage === "undefined") return;
    if (value == null || value === "") sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, value);
  } catch {
    /* private mode / quota — fall through */
  }
};

class PracticeStore {
  #listeners = new Set<() => void>();

  #zip: string = readSession(KEYS.ZIP) || "";
  #effectiveDate: string = readSession(KEYS.EFFECTIVE_DATE) || "";

  get zip(): string {
    return this.#zip;
  }
  set zip(v: string | null | undefined) {
    this.#zip = v || "";
    writeSession(KEYS.ZIP, this.#zip);
    this.#notify();
  }

  get effectiveDate(): string {
    return this.#effectiveDate;
  }
  set effectiveDate(v: string | null | undefined) {
    this.#effectiveDate = v || "";
    writeSession(KEYS.EFFECTIVE_DATE, this.#effectiveDate);
    this.#notify();
  }

  subscribe(listener: () => void): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  #notify() {
    this.#listeners.forEach((l) => l());
  }

  clear() {
    this.#zip = "";
    this.#effectiveDate = "";
    Object.values(KEYS).forEach((k) => writeSession(k, null));
    this.#notify();
  }
}

const practiceStore = new PracticeStore();
export default practiceStore;
