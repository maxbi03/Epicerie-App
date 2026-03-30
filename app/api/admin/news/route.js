import { getSupabaseAdmin } from '../../../lib/supabaseServer';
import { requireAdmin } from '../../../lib/adminUtils';
import { NextResponse } from 'next/server';
import { NEWS_TABLE } from '../../../lib/config';

export async function GET(request) {
  const { authorized } = await requireAdmin(request);
  if (!authorized) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from(NEWS_TABLE)
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
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
  const news = {
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

  const { data, error } = await getSupabaseAdmin()
    .from(NEWS_TABLE)
    .insert(news)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Une publication avec ce titre existe déjà' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
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

  const { data, error } = await getSupabaseAdmin()
    .from(NEWS_TABLE)
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Une publication avec ce titre existe déjà' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
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

  const { error } = await getSupabaseAdmin()
    .from(NEWS_TABLE)
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
