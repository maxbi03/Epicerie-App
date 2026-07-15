import { readFile } from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';
import { bucketPath } from '../../../../lib/storage';

const ALLOWED_BUCKETS = new Set(['avatars', 'products']);
const CONTENT_TYPES = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif',
};

// products : nom de fichier = UUID aléatoire par upload, jamais réécrit → cache
// long et "immutable" sans risque. avatars : nom de fichier = userId (stable,
// réécrit à chaque changement de photo) → cache court, PAS immutable, sinon
// une photo périmée resterait affichée indéfiniment après un changement.
const CACHE_CONTROL = {
  avatars: 'public, max-age=3600',
  products: 'public, max-age=31536000, immutable',
};

export async function GET(request, { params }) {
  const { bucket, filename } = await params;

  if (!ALLOWED_BUCKETS.has(bucket)) {
    return NextResponse.json({ error: 'Bucket invalide' }, { status: 400 });
  }
  // Anti path-traversal : uniquement des noms de fichier simples
  if (!filename || filename.includes('/') || filename.includes('..')) {
    return NextResponse.json({ error: 'Nom de fichier invalide' }, { status: 400 });
  }

  const ext = filename.split('.').pop()?.toLowerCase();
  const contentType = CONTENT_TYPES[ext];
  if (!contentType) {
    return NextResponse.json({ error: 'Type de fichier non supporté' }, { status: 400 });
  }

  try {
    const buffer = await readFile(path.join(bucketPath(bucket), filename));
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': CACHE_CONTROL[bucket],
      },
    });
  } catch (e) {
    if (e.code === 'ENOENT') return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
