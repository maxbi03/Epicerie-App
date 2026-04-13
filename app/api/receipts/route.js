import { getSupabaseAdmin } from '../../lib/supabaseServer';
import { getSession } from '../../lib/auth';
import { NextResponse } from 'next/server';
import { SALES_TABLE } from '../../lib/config';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await getSupabaseAdmin()
    .from(SALES_TABLE)
    .select('id, created_at, price, receipt, items_json, client_name')
    .eq('user_id', session.userId)
    .gte('created_at', since)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}
