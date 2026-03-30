import { getSupabaseAdmin } from '../../lib/supabaseServer';
import { NextResponse } from 'next/server';
import { NEWS_TABLE } from '../../lib/config';

export async function GET() {
  const { data, error } = await getSupabaseAdmin()
    .from(NEWS_TABLE)
    .select('*')
    .eq('is_published', true)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}
