import { useCallback, useMemo, useState } from "react";
import {
  PII_CATEGORIES,
  type PIICategoryKey,
} from "../../constants/categories";
import {
  encodeAddress,
  type AddressFields as AddressFieldValues,
} from "../../lib/address";

/** Categories the form can actually build a payload for (KYC is disabled). */
export type FormCategory = Exclude<PIICategoryKey, "KYC">;

export interface PIIFormResult {
  category: number;
  label: string;
  data: string;
}

export interface ValidationResult {
  valid: boolean;
  payload?: PIIFormResult;
}

/** Per-category mutable field bags held by the form hook. */
export interface PIIFormFields {
  address: AddressFieldValues;
  phone: { phonePrefix: string; phone: string };
  email: { email: string };
  custom: { label: string; data: string };
}

export const EMPTY_ADDRESS: AddressFieldValues = {
  country: "",
  province: "",
  city: "",
  street: "",
  lastName: "",
  firstName: "",
  phonePrefix: "",
  phone: "",
  email: "",
};

const INITIAL_FIELDS: PIIFormFields = {
  address: { ...EMPTY_ADDRESS },
  phone: { phonePrefix: "", phone: "" },
  email: { email: "" },
  custom: { label: "", data: "" },
};

// Basic email shape check: something@something.tld
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Pure, fully testable payload builder + validator for a single category.
 * Returns `{ valid }` (and a `payload` when valid) without touching state.
 */
export function buildPayloadFor(
  category: FormCategory,
  fields: PIIFormFields,
): ValidationResult {
  switch (category) {
    case "ADDRESS": {
      const a = fields.address;
      const required = [
        a.country,
        a.city,
        a.street,
        a.lastName,
        a.firstName,
      ];
      const valid = required.every((v) => v.trim().length > 0);
      if (!valid) return { valid: false };
      return {
        valid: true,
        payload: {
          category: PII_CATEGORIES.ADDRESS.id,
          label: "address",
          data: encodeAddress(a),
        },
      };
    }
    case "PHONE": {
      const number = fields.phone.phone.trim();
      if (number.length === 0) return { valid: false };
      const data = `${fields.phone.phonePrefix.trim()} ${number}`.trim();
      return {
        valid: true,
        payload: { category: PII_CATEGORIES.PHONE.id, label: "phone", data },
      };
    }
    case "EMAIL": {
      const email = fields.email.email.trim();
      if (!EMAIL_RE.test(email)) return { valid: false };
      return {
        valid: true,
        payload: { category: PII_CATEGORIES.EMAIL.id, label: "email", data: email },
      };
    }
    case "CUSTOM": {
      const label = fields.custom.label.trim();
      const data = fields.custom.data.trim();
      if (label.length === 0 || data.length === 0) return { valid: false };
      return {
        valid: true,
        payload: { category: PII_CATEGORIES.CUSTOM.id, label, data },
      };
    }
  }
}

type FieldGroupKey = keyof PIIFormFields;

export interface UsePIIForm {
  category: FormCategory;
  setCategory: (c: FormCategory) => void;
  fields: PIIFormFields;
  setField: <G extends FieldGroupKey, K extends keyof PIIFormFields[G]>(
    group: G,
    key: K,
    value: PIIFormFields[G][K],
  ) => void;
  result: ValidationResult;
  reset: () => void;
}

export function usePIIForm(): UsePIIForm {
  const [category, setCategory] = useState<FormCategory>("ADDRESS");
  const [fields, setFields] = useState<PIIFormFields>(() => ({
    address: { ...INITIAL_FIELDS.address },
    phone: { ...INITIAL_FIELDS.phone },
    email: { ...INITIAL_FIELDS.email },
    custom: { ...INITIAL_FIELDS.custom },
  }));

  const setField = useCallback(
    <G extends FieldGroupKey, K extends keyof PIIFormFields[G]>(
      group: G,
      key: K,
      value: PIIFormFields[G][K],
    ) => {
      setFields((prev) => ({
        ...prev,
        [group]: { ...prev[group], [key]: value },
      }));
    },
    [],
  );

  const reset = useCallback(() => {
    setFields({
      address: { ...INITIAL_FIELDS.address },
      phone: { ...INITIAL_FIELDS.phone },
      email: { ...INITIAL_FIELDS.email },
      custom: { ...INITIAL_FIELDS.custom },
    });
  }, []);

  const result = useMemo(
    () => buildPayloadFor(category, fields),
    [category, fields],
  );

  return { category, setCategory, fields, setField, result, reset };
}
