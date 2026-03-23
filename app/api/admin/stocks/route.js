import { getSupabaseAdmin } from '../../../lib/supabaseServer';
import { requireAdmin } from '../../../lib/adminUtils';
import { NextResponse } from 'next/server';

export async function PATCH(request) {
  const { authorized } = await requireAdmin(request);
  if (!authorized) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  const { updates } = await request.json();

  if (!Array.isArray(updates) || updates.length === 0) {
    return NextResponse.json({ error: 'Liste de mises à jour requise' }, { status: 400 });
  }

  const sb = getSupabaseAdmin();
  const errors = [];

  for (const { id, stock_shelf } of updates) {
    const { error } = await sb
      .from('products')
      .update({ stock_shelf: Math.max(0, Number(stock_shelf)) })
      .eq('id', id);

    if (error) {
      errors.push({ id, error: error.message });
    }
  }

  if (errors.length > 0) {
    return NextResponse.json({ success: false, errors }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
