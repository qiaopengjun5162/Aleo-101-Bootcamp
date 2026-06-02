import { test as base, expect } from "@playwright/test";

/**
 * Shared test fixture for the L3 suite.
 *
 * WHY THIS EXISTS — deterministic offline navigation:
 * `frontend/src/main.tsx` imports
 * `@demox-labs/aleo-wallet-adapter-reactui/styles.css`, whose first line is
 * `@import url('https://fonts.googleapis.com/css2?family=DM+Sans...')`. In the
 * offline CI/sandbox the font request never resolves, so the document `load`
 * event never fires and a default `page.goto("/")` (which waits for `load`)
 * times out at 30s even though the DOM is fully rendered.
 *
 * Per the testing charter (deterministic, no dependency on external state), we
 * abort all `fonts.googleapis.com` / `fonts.gstatic.com` requests at the test
 * layer. A failed stylesheet request still settles, so `load` fires promptly.
 * This touches NO frontend source and changes no app behavior (the CSS already
 * falls back to system fonts).
 *
 * All specs import `{ test, expect }` from THIS module instead of
 * `@playwright/test` so the block is applied uniformly before every navigation.
 */
const FONT_HOSTS = /fonts\.(googleapis|gstatic)\.com/;

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.route(FONT_HOSTS, (route) => route.abort());
    await use(page);
  },
});

export { expect };
