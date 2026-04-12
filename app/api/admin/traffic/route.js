import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../lib/supabaseServer';

export async function GET() {
  const { data, error } = await getSupabaseAdmin()
    .from('traffic')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
