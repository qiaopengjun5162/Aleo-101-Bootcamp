import type zh from "./zh";

/**
 * Widen the `as const` literal types of the canonical `zh` shape to their
 * primitive types while preserving the exact key structure. This makes `en`
 * a 1:1 structural mirror: a missing or extra key is a compile error, but the
 * actual translated string values are free.
 */
type Widen<T> = T extends string
  ? string
  : T extends readonly (infer U)[]
    ? readonly Widen<U>[]
    : { -readonly [K in keyof T]: Widen<T[K]> };

export type Strings = Widen<typeof zh>;

const en: Strings = {
  header: { logo: "Aleo PII Protocol", input: "Input", manage: "Manage" },
  hero: {
    title: "Your data, your rules",
    subtitle:
      "On-chain PII storage & authorization protocol powered by zero-knowledge proofs",
    cta: "Start recording",
    features: [
      {
        title: "Encrypted on-chain storage",
        desc: "Data is stored as private records, visible only to you",
      },
      {
        title: "Fine-grained authorization",
        desc: "Grant access to specific addresses by entry, purpose, and duration",
      },
      {
        title: "Revoke anytime",
        desc: "Revoke any granted access permission with one click",
      },
    ],
  },
  input: {
    category: "Data type",
    categories: {
      address: "Address",
      phone: "Phone",
      email: "Email",
      kyc: "KYC (coming soon)",
      custom: "Custom",
    },
    address: {
      country: "Country",
      province: "Province/State",
      city: "City",
      street: "Street",
      lastName: "Last name",
      firstName: "First name",
      phone: "Phone (optional)",
      phonePrefix: "Country code",
      email: "Email (optional)",
    },
    submit: "Submit on-chain",
    submitting: "Submitting...",
    success: "Submitted successfully",
  },
  manage: {
    title: "PII record management",
    empty: "No records yet, please record data first",
    refresh: "Refresh",
    expand: "Show details",
    share: "Share access",
    revoke: "Revoke access",
    authorizations: "Authorizations",
    noAuth: "No authorizations yet",
  },
  share: {
    title: "Configure authorization",
    recipient: "Recipient address",
    expiryMode: "Expiry mode",
    blockCount: "Block count",
    days: "Days",
    purpose: "Purpose",
    purposes: {
      delivery: "Delivery",
      verification: "Verification",
      billing: "Billing",
      communication: "Communication",
      custom: "Custom",
    },
    cancel: "Cancel",
    confirm: "Confirm authorization",
  },
  wallet: { connect: "Connect wallet", disconnect: "Disconnect", connected: "Connected" },
};

export default en;
