import { randomUUID } from 'crypto';
import { saveFile, deleteFileByUrl, extFromContentType } from './storage';

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_BYTES = 8 * 1024 * 1024; // 8 Mo
const DOWNLOAD_TIMEOUT_MS = 10000;
const LOCAL_PREFIX = '/api/uploads/products/';

/** true si l'URL pointe déjà vers un fichier stocké localement (pas la peine de re-télécharger). */
export function isLocalProductImage(url) {
  return typeof url === 'string' && url.startsWith(LOCAL_PREFIX);
}

/**
 * Détecte le type d'image via ses octets magiques — plus fiable qu'un en-tête
 * Content-Type distant, parfois mal formé (ex. "image" au lieu de "image/jpeg").
 */
function sniffImageType(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer.length >= 4 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return 'image/png';
  if (buffer.length >= 4 && buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) return 'image/gif';
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}

/** Télécharge une image distante et la stocke localement. Retourne l'URL locale. */
export async function downloadAndStoreProductImage(url) {
  let res;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS) });
  } catch (e) {
    throw new Error(`Téléchargement de l'image impossible (${e.message})`);
  }
  if (!res.ok) throw new Error(`Téléchargement de l'image échoué (${res.status})`);

  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length > MAX_BYTES) throw new Error('Image trop grande (max 8 Mo)');

  const headerType = res.headers.get('content-type')?.split(';')[0].trim();
  const contentType = (headerType && ALLOWED_TYPES.has(headerType)) ? headerType : sniffImageType(buffer);
  if (!contentType) {
    throw new Error(`Type d'image non supporté (${headerType || 'inconnu'})`);
  }

  const ext = extFromContentType(contentType);
  return saveFile('products', `${randomUUID()}.${ext}`, buffer);
}

/** Stocke un fichier uploadé directement (multipart) et retourne l'URL locale. */
export async function storeUploadedProductImage(file) {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error('Format non supporté. Utilisez JPEG, PNG, WebP ou GIF.');
  }
  if (file.size > MAX_BYTES) throw new Error('Image trop grande (max 8 Mo)');

  const ext = extFromContentType(file.type);
  const buffer = Buffer.from(await file.arrayBuffer());
  return saveFile('products', `${randomUUID()}.${ext}`, buffer);
}

export const deleteProductImageByUrl = (url) => deleteFileByUrl('products', url);
