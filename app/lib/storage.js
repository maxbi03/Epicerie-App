import { mkdir, unlink } from 'fs/promises';
import path from 'path';

// Stockage fichier local (remplace Supabase Storage). Hors de public/ pour ne
// pas mélanger les uploads utilisateur avec les assets statiques du build.
const AVATARS_DIR = path.join(process.cwd(), 'uploads', 'avatars');
const URL_PREFIX = '/api/uploads/avatars/';

export function extFromContentType(contentType) {
  return contentType.split('/')[1].replace('jpeg', 'jpg');
}

/** Enregistre un avatar sur disque et retourne son URL publique. */
export async function saveAvatar(userId, ext, buffer) {
  await mkdir(AVATARS_DIR, { recursive: true });
  const filename = `${userId}.${ext}`;
  const { writeFile } = await import('fs/promises');
  await writeFile(path.join(AVATARS_DIR, filename), buffer);
  return `${URL_PREFIX}${filename}`;
}

/** Supprime le fichier avatar correspondant à une URL (silencieux si absent). */
export async function deleteAvatarByUrl(url) {
  if (!url || !url.startsWith(URL_PREFIX)) return;
  const filename = url.slice(URL_PREFIX.length);
  if (!filename || filename.includes('/') || filename.includes('..')) return;
  try {
    await unlink(path.join(AVATARS_DIR, filename));
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
}

export { AVATARS_DIR };
