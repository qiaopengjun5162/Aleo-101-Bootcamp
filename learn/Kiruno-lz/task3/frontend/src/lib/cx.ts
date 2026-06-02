/**
 * Tiny className joiner. Filters out falsy parts and joins the rest with
 * single spaces. A dependency-free stand-in for `clsx`.
 */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter((part): part is string => Boolean(part)).join(" ");
}
