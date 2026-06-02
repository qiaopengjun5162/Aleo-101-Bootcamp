import type { JSX } from "react";
import { useI18n } from "../i18n";
import { ShieldIcon, KeyIcon, LockIcon } from "./icons";

const FEATURE_ICONS = [ShieldIcon, KeyIcon, LockIcon] as const;

export function HeroSection({ onStart }: { onStart: () => void }): JSX.Element {
  const { t } = useI18n();

  return (
    <section className="flex min-h-[calc(100vh-56px)] flex-col items-center justify-center gap-10 px-4 py-16 text-center">
      <div className="flex flex-col items-center gap-4">
        <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-[var(--text-primary)] md:text-5xl">
          {t.hero.title}
        </h1>
        <p className="max-w-xl text-base text-[var(--text-secondary)] md:text-lg">
          {t.hero.subtitle}
        </p>
      </div>

      <div className="grid w-full max-w-4xl grid-cols-1 gap-4 md:grid-cols-3">
        {t.hero.features.map((feature, index) => {
          const Icon = FEATURE_ICONS[index % FEATURE_ICONS.length] ?? ShieldIcon;
          return (
            <div
              key={feature.title}
              className="flex flex-col items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 text-center transition hover:-translate-y-0.5"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--bg-secondary)] text-[var(--accent)]">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                {feature.title}
              </h3>
              <p className="text-sm text-[var(--text-secondary)]">
                {feature.desc}
              </p>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onStart}
        className="rounded-lg bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-[var(--bg-primary)] transition hover:bg-[var(--accent-hover)]"
      >
        {t.hero.cta}
      </button>
    </section>
  );
}
