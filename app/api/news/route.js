import { NextResponse } from 'next/server';
import { db } from '../../lib/db';
import { news } from '../../lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET() {
  try {
    const data = await db
      .select()
      .from(news)
      .where(eq(news.is_published, true))
      .orderBy(desc(news.created_at));
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
