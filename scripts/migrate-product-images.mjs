// Migration des images produits (liens externes) → fichiers locaux (uploads/products/).
// Télécharge chaque image_url externe, l'enregistre en local, et met à jour la
// ligne product_list avec la nouvelle URL locale.
//   node scripts/migrate-product-images.mjs
import { readFileSync } from 'fs';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import pkg from 'pg';
const { Client } = pkg;

function env(key) {
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && m[1] === key) return m[2].replace(/^["']|["']$/g, '');
  }
  return '';
}

const PRODUCTS_DIR = path.join(process.cwd(), 'uploads', 'products');
const URL_PREFIX = '/api/uploads/products/';
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

function extFromContentType(ct) {
  return ct.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
}

// Détecte le type via les octets magiques (fallback si Content-Type est mal formé, ex. "image").
function sniffImageType(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer.length >= 4 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return 'image/png';
  if (buffer.length >= 4 && buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) return 'image/gif';
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}

const tgt = new Client({ connectionString: env('DATABASE_URL') });
await tgt.connect();

const { rows } = await tgt.query(
  "select id, name, image_url from product_list where image_url like 'http%'"
);

console.log(`Images produits à migrer : ${rows.length}`);
await mkdir(PRODUCTS_DIR, { recursive: true });

let ok = 0, failed = 0;
for (const p of rows) {
  try {
    const res = await fetch(p.image_url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const buffer = Buffer.from(await res.arrayBuffer());
    const headerType = res.headers.get('content-type')?.split(';')[0].trim();
    const contentType = (headerType && ALLOWED_TYPES.has(headerType)) ? headerType : sniffImageType(buffer);
    if (!contentType) {
      throw new Error(`type non supporté (${headerType || 'inconnu'})`);
    }

    const filename = `${randomUUID()}.${extFromContentType(contentType)}`;
    await writeFile(path.join(PRODUCTS_DIR, filename), buffer);

    const newUrl = `${URL_PREFIX}${filename}`;
    await tgt.query('update product_list set image_url = $1 where id = $2', [newUrl, p.id]);
    console.log(`  ✅ ${p.name} → ${filename} (${buffer.length} octets)`);
    ok++;
  } catch (e) {
    console.log(`  ❌ ${p.name} (${p.id}) : ${e.message}`);
    failed++;
  }
}

await tgt.end();
console.log(`\n✅ Migration terminée : ${ok} réussies, ${failed} échouées.`);
