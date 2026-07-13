import { readFile } from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';
import { AVATARS_DIR } from '../../../../lib/storage';

const CONTENT_TYPES = {
  jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif',
};

export async function GET(request, { params }) {
  const { filename } = await params;

  // Anti path-traversal : uniquement des noms de fichier simples (userId.ext)
  if (!filename || filename.includes('/') || filename.includes('..')) {
    return NextResponse.json({ error: 'Nom de fichier invalide' }, { status: 400 });
  }

  const ext = filename.split('.').pop()?.toLowerCase();
  const contentType = CONTENT_TYPES[ext];
  if (!contentType) {
    return NextResponse.json({ error: 'Type de fichier non supporté' }, { status: 400 });
  }

  try {
    const buffer = await readFile(path.join(AVATARS_DIR, filename));
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (e) {
    if (e.code === 'ENOENT') return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
