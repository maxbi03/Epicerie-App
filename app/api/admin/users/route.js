import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../lib/supabaseServer';
import { requireAdmin } from '../../../lib/adminUtils';

const USER_COLUMNS =
  'id, name, email, phone, phone_verified, email_verified, address, address_label, street, house_number, postal_code, city, country, address_verified, role, total_spent, created_at, avatar_url';

export async function GET() {
  const { authorized } = await requireAdmin();
  if (!authorized) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });

  const { data, error } = await getSupabaseAdmin()
    .from('users')
    .select(USER_COLUMNS);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// PATCH /api/admin/users — actions admin sur un utilisateur
// Body: { action: 'reset_spent', userId }
export async function PATCH(request) {
  const { authorized } = await requireAdmin();
  if (!authorized) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });

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
