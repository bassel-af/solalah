import { NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

// Public paths that don't require authentication
const PUBLIC_PATHS = [
  '/',
  '/auth/login',
  '/auth/signup',
  '/auth/callback',
  '/auth/confirm',
  '/auth/forgot-password',
  '/policy',
  '/islamic-gedcom',
  '/test', // test route for browser testing
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(path + '/'));
}

function isStaticAsset(pathname: string): boolean {
  return (
    pathname.startsWith('/_next') ||
    pathname.includes('.') // files with extensions (images, fonts, etc.)
  );
}

function isApiRoute(pathname: string): boolean {
  return pathname.startsWith('/api');
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware entirely for static assets (no session refresh needed)
  if (isStaticAsset(pathname)) {
    return NextResponse.next();
  }

  // Allow public paths without session refresh
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // For API routes, run session refresh but do NOT redirect on auth failure.
  // Individual API route handlers call getAuthenticatedUser() and return 401 themselves.
  if (isApiRoute(pathname)) {
    const { supabaseResponse } = await updateSession(request);
    return supabaseResponse;
  }

  // For protected page routes, verify/refresh the session and redirect if unauthenticated
  const { user, supabaseResponse } = await updateSession(request);

  if (!user) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Match all paths except static files and Next.js internals
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
