import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../lib/supabaseServer';
import { SALES_TABLE } from '../../../lib/config';

export async function GET() {
  const { data, error } = await getSupabaseAdmin()
    .from(SALES_TABLE)
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
