'use client';

import { useEffect } from 'react';

// Capture the hash IMMEDIATELY at module load, before Supabase's
// createBrowserClient (instantiated elsewhere in the app) auto-detects and
// consumes #access_token fragments. This is load-bearing — reading
// window.location.hash later would return an empty string.
const initialHash = typeof window !== 'undefined' ? window.location.hash : '';
const initialSearch = typeof window !== 'undefined' ? window.location.search : '';

export default function LandingRedirector() {
  useEffect(() => {
    console.log('[root] Page loaded');
    console.log(
      '[root] Hash:',
      initialHash ? initialHash.substring(0, 80) + '...' : '(empty)',
    );
    console.log('[root] Search:', initialSearch || '(empty)');

    if (
      initialHash &&
      (initialHash.includes('access_token=') ||
        initialHash.includes('message=') ||
        initialHash.includes('error'))
    ) {
      console.log('[root] Forwarding hash fragment to /auth/confirm');
      window.location.href = '/auth/confirm' + initialHash;
      return;
    }

    const rootSearchParams = new URLSearchParams(initialSearch);
    if (rootSearchParams.has('code')) {
      console.log('[root] Forwarding PKCE code to /auth/confirm');
      window.location.href = '/auth/confirm' + initialSearch;
      return;
    }
  }, []);

  return null;
}
