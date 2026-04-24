import { describe, test, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import type { ReactElement } from 'react';

/**
 * Phase 0 SEO — landing page split.
 *
 * `src/app/page.tsx` must be a pure server component so Googlebot/WhatsApp
 * crawlers receive the hero HTML instead of an empty document. This smoke
 * test renders the default export to a string and asserts the hero title
 * appears in the output.
 *
 * We stub Supabase's browser client in case any child accidentally imports
 * it — a server component should not depend on it, but the import graph
 * runs at module load time.
 */

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getSession: () => Promise.resolve({ data: { session: null } }),
    },
  }),
}));

describe('src/app/page.tsx landing page', () => {
  test('default export renders the hero title in server-rendered HTML', async () => {
    const mod = await import('@/app/page');
    expect(typeof mod.default).toBe('function');

    // Next.js App Router server components may be async. `renderToString`
    // requires a synchronous ReactElement, but since this landing page has
    // no async data-fetching, calling the component directly returns JSX.
    const element = (mod.default as () => ReactElement)();
    const html = renderToString(element);

    expect(html).toContain('شَجَرةُ عائلتك');
    expect(html).toContain('<h1');
  });
});
