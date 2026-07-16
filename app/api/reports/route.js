import { NextResponse } from 'next/server';
import { db } from '../../lib/db';
import { reports } from '../../lib/db/schema';
import { reportCreateSchema } from '../../lib/schemas';
import { parseBody } from '../../lib/validation';

export async function POST(request) {
  // Allow visitors (no auth required — anyone in the store can report)
  const { data: body, error: validationError } = await parseBody(request, reportCreateSchema);
  if (validationError) return validationError;
  const { type, description, user_id } = body;

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
