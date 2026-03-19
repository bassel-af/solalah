import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { User } from '@supabase/supabase-js';

interface AuthResult {
  user: User | null;
  error: string | null;
}

/**
 * Extracts and validates the Bearer token from a NextRequest.
 * Returns the authenticated Supabase user or an error message.
 */
export async function getAuthenticatedUser(request: NextRequest): Promise<AuthResult> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { user: null, error: 'Missing authorization' };
  }

  const token = authHeader.slice(7);
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError) {
    return { user: null, error: authError.message };
  }

  if (!user) {
    return { user: null, error: 'User not found' };
  }

  return { user, error: null };
}
