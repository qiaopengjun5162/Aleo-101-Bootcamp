import type { JSX } from "react";
import {
  CATEGORY_BADGE_CLASSES,
  PII_CATEGORIES,
  categoryKeyById,
  type PIICategoryKey,
} from "../constants/categories";
import { useTheme } from "../theme/ThemeProvider";
import { useI18n } from "../i18n";
import { cx } from "../lib/cx";

export function CategoryBadge({
  category,
}: {
  category: number | PIICategoryKey;
}): JSX.Element {
  const { theme } = useTheme();
  const { t } = useI18n();

  const key: PIICategoryKey =
    typeof category === "number" ? categoryKeyById(category) : category;

  const palette = CATEGORY_BADGE_CLASSES[key];
  const classes = theme === "dark" ? palette.dark : palette.light;
  const label = t.input.categories[PII_CATEGORIES[key].i18nKey];

  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        classes,
      )}
    >
      {label}
    </span>
  );
}
