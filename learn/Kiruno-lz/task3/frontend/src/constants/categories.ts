export const PII_CATEGORIES = {
  ADDRESS: { id: 0, i18nKey: "address", color: "blue" },
  PHONE: { id: 1, i18nKey: "phone", color: "green" },
  EMAIL: { id: 2, i18nKey: "email", color: "amber" },
  CUSTOM: { id: 3, i18nKey: "custom", color: "slate" },
  KYC: { id: 4, i18nKey: "kyc", color: "purple", disabled: true },
} as const;

export type PIICategoryKey = keyof typeof PII_CATEGORIES;
export type PIICategory = (typeof PII_CATEGORIES)[PIICategoryKey];

export function categoryKeyById(id: number): PIICategoryKey {
  const k = (Object.keys(PII_CATEGORIES) as PIICategoryKey[]).find(
    (key) => PII_CATEGORIES[key].id === id,
  );
  return k ?? "CUSTOM";
}

export function categoryByKey(key: PIICategoryKey) {
  return PII_CATEGORIES[key];
}

/**
 * Light + dark Tailwind class strings per category badge.
 * Source: frontend-refactor-plan §9 "Category Colors".
 * KYC is a disabled placeholder; uses the purple accent for visual hint.
 */
export const CATEGORY_BADGE_CLASSES: Record<
  PIICategoryKey,
  { light: string; dark: string }
> = {
  ADDRESS: {
    light: "bg-blue-50 text-blue-700 border-blue-200",
    dark: "bg-blue-900/30 text-blue-300 border-blue-700",
  },
  PHONE: {
    light: "bg-green-50 text-green-700 border-green-200",
    dark: "bg-green-900/30 text-green-300 border-green-700",
  },
  EMAIL: {
    light: "bg-amber-50 text-amber-700 border-amber-200",
    dark: "bg-amber-900/30 text-amber-300 border-amber-700",
  },
  CUSTOM: {
    light: "bg-slate-50 text-slate-700 border-slate-200",
    dark: "bg-slate-800 text-slate-300 border-slate-600",
  },
  KYC: {
    light: "bg-purple-50 text-purple-700 border-purple-200",
    dark: "bg-purple-900/30 text-purple-300 border-purple-700",
  },
} as const;

/**
 * Standard share purposes (contract §8).
 * Codes 1..4 are standard; custom purposes use a user-entered code >= 1000.
 * i18nKey maps under `share.purposes`.
 */
export const PURPOSES = [
  { code: 1, i18nKey: "delivery" },
  { code: 2, i18nKey: "verification" },
  { code: 3, i18nKey: "billing" },
  { code: 4, i18nKey: "communication" },
  { code: 1000, i18nKey: "custom" },
] as const;

export type Purpose = (typeof PURPOSES)[number];
export const CUSTOM_PURPOSE_MIN = 1000;
