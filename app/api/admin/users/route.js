import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../lib/supabaseServer';
import { getSession } from '../../../lib/auth';

async function isAdmin(adminEmail) {
  const session = await getSession();
  return session?.email?.toLowerCase() === adminEmail?.toLowerCase();
}

export async function GET() {
  const { data, error } = await getSupabaseAdmin()
    .from('users')
    .select('*');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// PATCH /api/admin/users — actions admin sur un utilisateur
// Body: { action: 'reset_spent', userId }
export async function PATCH(request) {
  const admin = await isAdmin(process.env.NEXT_PUBLIC_ADMIN_EMAIL);
  if (!admin) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });

  const { action, userId } = await request.json();

  if (action === 'reset_spent') {
    if (!userId) return NextResponse.json({ error: 'userId requis' }, { status: 400 });

    const { error } = await getSupabaseAdmin()
      .from('users')
      .update({ total_spent: 0 })
      .eq('id', userId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Action inconnue' }, { status: 400 });
}
