import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../../../../generated/prisma/client';

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
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  }

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  try {
    const dbUser = await prisma.user.upsert({
      where: { id: user.id },
      update: {
        email: user.email!,
        displayName: user.user_metadata?.display_name || user.email!.split('@')[0],
        avatarUrl: user.user_metadata?.avatar_url || null,
        phone: user.phone || null,
      },
      create: {
        id: user.id,
        email: user.email!,
        displayName: user.user_metadata?.display_name || user.email!.split('@')[0],
        avatarUrl: user.user_metadata?.avatar_url || null,
        phone: user.phone || null,
      },
    });

    return NextResponse.json({ user: dbUser });
  } finally {
    await prisma.$disconnect();
  }
}
