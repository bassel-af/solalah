import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { syncUserToDb } from '@/lib/auth/sync-user';

// POST /api/auth/sync-user
// Called after successful sign-in/sign-up to ensure the user exists in public.users.
// This mirrors the GoTrue auth.users record into our application schema.
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Missing authorization' }, { status: 401 });
  }

  const token = authHeader.slice(7);
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    console.log('[sync-user] Auth failed:', authError?.message ?? 'no user');
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  }

  console.log('[sync-user] Syncing user:', user.id, 'email:', user.email);
  const dbUser = await syncUserToDb(user);
  console.log('[sync-user] Synced successfully, db email:', dbUser.email);
  return NextResponse.json({ user: dbUser });
}
