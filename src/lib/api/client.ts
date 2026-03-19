import { createClient } from '@/lib/supabase/client';

/**
 * Client-side fetch wrapper that automatically attaches the Bearer token
 * from the current Supabase session to API requests.
 */
export async function apiFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('No active session');
  }

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
    Authorization: `Bearer ${session.access_token}`,
  };

  return fetch(path, {
    ...options,
    headers,
  });
}
