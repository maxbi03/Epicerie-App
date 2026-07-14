import { mkdir, unlink, writeFile } from 'fs/promises';
import path from 'path';

// Stockage fichier local par "bucket" (avatars, products...). Hors de public/
// pour ne pas mélanger les uploads utilisateur avec les assets statiques du build.
const UPLOADS_ROOT = path.join(process.cwd(), 'uploads');
const URL_PREFIX = '/api/uploads';

export function extFromContentType(contentType) {
  return contentType.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
}

export function bucketPath(bucket) {
  return path.join(UPLOADS_ROOT, bucket);
}

/** Enregistre un fichier dans un bucket et retourne son URL publique. */
export async function saveFile(bucket, filename, buffer) {
  const dir = bucketPath(bucket);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), buffer);
  return `${URL_PREFIX}/${bucket}/${filename}`;
}

/** Supprime le fichier correspondant à une URL locale (silencieux si absent ou externe). */
export async function deleteFileByUrl(bucket, url) {
  const prefix = `${URL_PREFIX}/${bucket}/`;
  if (!url || !url.startsWith(prefix)) return;
  const filename = url.slice(prefix.length);
  if (!filename || filename.includes('/') || filename.includes('..')) return;
  try {
    await unlink(path.join(bucketPath(bucket), filename));
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
}

// ─── Avatars (compat des appelants existants) ───
export const AVATARS_DIR = bucketPath('avatars');
export const saveAvatar = (userId, ext, buffer) => saveFile('avatars', `${userId}.${ext}`, buffer);
export const deleteAvatarByUrl = (url) => deleteFileByUrl('avatars', url);
