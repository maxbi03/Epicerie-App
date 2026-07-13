import { db } from '../../../lib/db';
import { news } from '../../../lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { requireAdmin } from '../../../lib/adminUtils';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const { authorized } = await requireAdmin(request);
  if (!authorized) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  try {
    const data = await db.select().from(news).orderBy(desc(news.created_at));
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request) {
  const { authorized } = await requireAdmin(request);
  if (!authorized) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  const body = await request.json();
  const { category, type, title, subtitle, content, image1, image2, link } = body;

  if (!title || !title.trim()) {
    return NextResponse.json({ error: 'Le titre est requis' }, { status: 400 });
  }
  const newsRow = {
    created_at: new Date().toISOString(),
    category: category || 'com',
    type: type && type.trim() ? type.trim() : null,
    title: title.trim(),
    subtitle: subtitle && subtitle.trim() ? subtitle.trim() : null,
    content: content && content.trim() ? content.trim() : null,
    image1: image1 && image1.trim() ? image1.trim() : null,
    image2: image2 && image2.trim() ? image2.trim() : null,
    link: link && link.trim() ? link.trim() : null,
    link_name: body.link_name && body.link_name.trim() ? body.link_name.trim() : null,
    is_published: true,
  };

  try {
    const [data] = await db.insert(news).values(newsRow).returning();
    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    if (e.code === '23505') {
      return NextResponse.json({ error: 'Une publication avec ce titre existe déjà' }, { status: 409 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  const { authorized } = await requireAdmin(request);
  if (!authorized) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  const body = await request.json();
  const { id, ...fields } = body;

  if (!id) {
    return NextResponse.json({ error: 'ID requis' }, { status: 400 });
  }

  const ALLOWED = ['category', 'type', 'title', 'subtitle', 'content', 'image1', 'image2', 'link', 'link_name', 'is_published'];
  const update = {};
  for (const key of ALLOWED) {
    if (fields[key] !== undefined) {
      if (key === 'type' || key === 'subtitle' || key === 'content' || key === 'image1' || key === 'image2' || key === 'link' || key === 'link_name') {
        update[key] = fields[key] && String(fields[key]).trim() ? String(fields[key]).trim() : null;
      } else {
        update[key] = fields[key];
      }
    }
  }

  try {
    const [data] = await db.update(news).set(update).where(eq(news.id, id)).returning();
    return NextResponse.json(data);
  } catch (e) {
    if (e.code === '23505') {
      return NextResponse.json({ error: 'Une publication avec ce titre existe déjà' }, { status: 409 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  const { authorized } = await requireAdmin(request);
  if (!authorized) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  const { id } = await request.json();

  if (!id) {
    return NextResponse.json({ error: 'ID requis' }, { status: 400 });
  }

  try {
    await db.delete(news).where(eq(news.id, id));
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
