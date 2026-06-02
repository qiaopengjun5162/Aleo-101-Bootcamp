import type { JSX } from "react";

interface IconProps {
  className?: string;
}

const BASE = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function SunIcon({ className }: IconProps): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...BASE}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
    </svg>
  );
}

export function MoonIcon({ className }: IconProps): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...BASE}>
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  );
}

export function PlusIcon({ className }: IconProps): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...BASE}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function ChevronDownIcon({ className }: IconProps): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...BASE}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function XIcon({ className }: IconProps): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...BASE}>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

export function ShieldIcon({ className }: IconProps): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...BASE}>
      <path d="M12 3 5 6v5c0 4.5 3 7.7 7 9 4-1.3 7-4.5 7-9V6z" />
      <path d="m9.5 12 1.8 1.8 3.2-3.6" />
    </svg>
  );
}

export function KeyIcon({ className }: IconProps): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...BASE}>
      <circle cx="7.5" cy="15.5" r="3.5" />
      <path d="m10 13 8-8M16 3l3 3-2 2-3-3M14.5 8.5l2 2" />
    </svg>
  );
}

export function TrashIcon({ className }: IconProps): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...BASE}>
      <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13M10 11v6M14 11v6" />
    </svg>
  );
}

export function LockIcon({ className }: IconProps): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...BASE}>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3M12 15v2" />
    </svg>
  );
}
