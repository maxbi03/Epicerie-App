import { NextResponse } from 'next/server';
import { db } from '../../lib/db';
import { reports } from '../../lib/db/schema';

const TYPES = ['product_missing', 'product_damaged', 'store_dirty', 'technical', 'other'];

export async function POST(request) {
  // Allow visitors (no auth required — anyone in the store can report)
  const body = await request.json();
  const { type, description, user_id } = body;

  if (!type || !TYPES.includes(type)) {
    return NextResponse.json({ error: 'Type de signalement invalide' }, { status: 400 });
  }

  try {
    const [data] = await db
      .insert(reports)
      .values({
        type,
        description: (description || '').trim() || null,
        user_id: user_id || null,
        status: 'pending',
      })
      .returning();
    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
