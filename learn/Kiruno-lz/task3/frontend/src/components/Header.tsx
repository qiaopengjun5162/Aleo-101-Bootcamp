import type { JSX } from "react";
import { useI18n } from "../i18n";
import { useTheme } from "../theme/ThemeProvider";
import { WalletStatus } from "../features/wallet/WalletStatus";
import { SunIcon, MoonIcon } from "./icons";
import { cx } from "../lib/cx";

export type Tab = "hero" | "input" | "manage";

export function Header({
  tab,
  onTabChange,
}: {
  tab: Tab;
  onTabChange: (t: Tab) => void;
}): JSX.Element {
  const { t, lang, setLang } = useI18n();
  const { theme, toggle } = useTheme();

  const pillBase =
    "rounded-full px-4 py-1.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]";

  const renderPill = (target: "input" | "manage", label: string) => {
    const active = tab === target;
    return (
      <button
        type="button"
        aria-pressed={active}
        onClick={() => onTabChange(target)}
        className={cx(
          pillBase,
          active
            ? "bg-[var(--accent)] text-[var(--bg-primary)]"
            : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
        )}
      >
        {label}
      </button>
    );
  };

  const iconBtn =
    "flex h-9 w-9 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-primary)] transition hover:bg-[var(--bg-secondary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]";

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--bg-primary)]/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-y-2 px-4 py-2 md:h-14 md:flex-nowrap md:py-0">
        <div className="flex flex-1 items-center">
          <button
            type="button"
            onClick={() => onTabChange("hero")}
            className="text-base font-bold text-[var(--text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            {t.header.logo}
          </button>
        </div>

        <nav className="order-last flex w-full justify-center gap-1 rounded-full md:order-none md:w-auto">
          <div className="flex gap-1 rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] p-1">
            {renderPill("input", t.header.input)}
            {renderPill("manage", t.header.manage)}
          </div>
        </nav>

        <div className="flex flex-1 items-center justify-end gap-2">
          <button
            type="button"
            onClick={toggle}
            aria-label={theme === "dark" ? "Switch to light" : "Switch to dark"}
            className={iconBtn}
          >
            {theme === "dark" ? (
              <SunIcon className="h-5 w-5" />
            ) : (
              <MoonIcon className="h-5 w-5" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setLang(lang === "zh" ? "en" : "zh")}
            aria-label="Toggle language"
            className={cx(iconBtn, "text-sm font-semibold")}
          >
            {lang === "zh" ? "EN" : "中"}
          </button>
          <WalletStatus />
        </div>
      </div>
    </header>
  );
}
