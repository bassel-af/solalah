import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { syncUserToDb } from '@/lib/auth/sync-user';

// This route handles OAuth callbacks and email confirmation links from GoTrue.
// After GoTrue redirects here with a code, we exchange it for a session.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const response = NextResponse.redirect(new URL(next, request.url));

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options),
            );
          },
        },
      },
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.session && data.user) {
      // Sync user to public.users table (server-side, no HTTP fetch needed)
      try {
        await syncUserToDb(data.user);
      } catch {
        // Log but don't block the redirect -- user sync can be retried on next login
        console.error('Failed to sync user to database during callback');
      }

      return response;
    }
  }

  // If no code or exchange failed, redirect to login
  return NextResponse.redirect(new URL('/auth/login', request.url));
}
