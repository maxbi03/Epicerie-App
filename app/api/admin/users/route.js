import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../lib/supabaseServer';

export async function GET() {
  // Récupérer tout sauf id et password_hash
  const { data, error } = await getSupabaseAdmin()
    .from('users')
    .select('*');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
