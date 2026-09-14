/**
 * The applicant's identity, collected on step 3 (`/register`), plus the
 * optional medical licence number.
 *
 * ⚠ THE SSN IS NEVER WRITTEN TO BROWSER STORAGE. ⚠
 * The SSN (and DOB) are optional fields sent once, over the wire, in the
 * `POST /auth/signup` body — `ins` stores them on the insured record
 * (`InsuredRequest.ssn` → `insured.taxid`, `InsuredRequest.dob` →
 * `insured.dob`). On the client the SSN stays a plain private field with no
 * storage mirror and is never logged. A refresh before signup completes loses
 * it and the form asks for it again — intended, since it must not sit in
 * storage on what may be a shared machine.
 *
 * Nothing in this store is persisted: after a reload `hydrateStoresFromOrder`
 * refills the name / contact / address blanks from the loaded order.
 */

export interface Address {
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
}

const emptyAddress = (): Address => ({ address1: "", address2: "", city: "", state: "", zip: "" });

type Nullable = string | null | undefined;

class ApplicantProfileStore {
  #listeners = new Set<() => void>();

  #firstName = "";
  #middleName = "";
  #lastName = "";
  #dateOfBirth = "";
  #ssn = ""; // memory only — see the header
  #licenseNumber = "";
  #homeAddress: Address = emptyAddress();
  #homePhone = "";
  #cellPhone = "";
  #email = "";

  get firstName(): string {
    return this.#firstName;
  }
  set firstName(v: Nullable) {
    this.#firstName = v ?? "";
    this.#notify();
  }

  get middleName(): string {
    return this.#middleName;
  }
  set middleName(v: Nullable) {
    this.#middleName = v ?? "";
    this.#notify();
  }

  get lastName(): string {
    return this.#lastName;
  }
  set lastName(v: Nullable) {
    this.#lastName = v ?? "";
    this.#notify();
  }

  get dateOfBirth(): string {
    return this.#dateOfBirth;
  }
  set dateOfBirth(v: Nullable) {
    this.#dateOfBirth = v ?? "";
    this.#notify();
  }

  get ssn(): string {
    return this.#ssn;
  }
  set ssn(v: Nullable) {
    this.#ssn = v ?? "";
    this.#notify();
  }

  /** Medical licence number — optional; rides `POST /auth/signup` as `InsuredRequest.licenseNumber`. */
  get licenseNumber(): string {
    return this.#licenseNumber;
  }
  set licenseNumber(v: Nullable) {
    this.#licenseNumber = v ?? "";
    this.#notify();
  }

  /** The primary practice address (the registration form's address block). */
  get homeAddress(): Address {
    return this.#homeAddress;
  }
  set homeAddress(v: Partial<Address> | null | undefined) {
    this.#homeAddress = { ...emptyAddress(), ...(v || {}) };
    this.#notify();
  }
  setAddressField(field: keyof Address, value: Nullable) {
    this.#homeAddress = { ...this.#homeAddress, [field]: value ?? "" };
    this.#notify();
  }

  get homePhone(): string {
    return this.#homePhone;
  }
  set homePhone(v: Nullable) {
    this.#homePhone = v ?? "";
    this.#notify();
  }

  get cellPhone(): string {
    return this.#cellPhone;
  }
  set cellPhone(v: Nullable) {
    this.#cellPhone = v ?? "";
    this.#notify();
  }

  get email(): string {
    return this.#email;
  }
  set email(v: Nullable) {
    this.#email = v ?? "";
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
    this.#firstName = "";
    this.#middleName = "";
    this.#lastName = "";
    this.#dateOfBirth = "";
    this.#ssn = "";
    this.#licenseNumber = "";
    this.#homeAddress = emptyAddress();
    this.#homePhone = "";
    this.#cellPhone = "";
    this.#email = "";
    this.#notify();
  }
}

const applicantProfileStore = new ApplicantProfileStore();
export default applicantProfileStore;
