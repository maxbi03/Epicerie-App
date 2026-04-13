import { getSupabaseAdmin } from '../../lib/supabaseServer';
import { NextResponse } from 'next/server';
import { requireAuth } from '../../lib/auth';

const TYPES = ['product_missing', 'product_damaged', 'store_dirty', 'other'];

export async function POST(request) {
  // Allow visitors (no auth required — anyone in the store can report)
  const body = await request.json();
  const { type, description, user_id } = body;

  if (!type || !TYPES.includes(type)) {
    return NextResponse.json({ error: 'Type de signalement invalide' }, { status: 400 });
  }

  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from('reports')
    .insert({
      type,
      description: (description || '').trim() || null,
      user_id: user_id || null,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
