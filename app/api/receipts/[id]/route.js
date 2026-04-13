import { getSupabaseAdmin } from '../../../lib/supabaseServer';
import { getSession } from '../../../lib/auth';
import { NextResponse } from 'next/server';
import { SALES_TABLE } from '../../../lib/config';

export async function GET(request, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const { id } = await params;
  const { data, error } = await getSupabaseAdmin()
    .from(SALES_TABLE)
    .select('id, created_at, price, receipt, items_json, client_name')
    .eq('id', id)
    .eq('user_id', session.userId)   // security: own receipts only
    .single();

  if (error || !data) return NextResponse.json({ error: 'Reçu introuvable' }, { status: 404 });
  return NextResponse.json(data);
}
