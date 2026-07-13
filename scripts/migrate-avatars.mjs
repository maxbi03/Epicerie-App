// Migration des avatars Supabase Storage → fichiers locaux (uploads/avatars/).
// Télécharge chaque avatar_url pointant encore vers Supabase, l'enregistre en
// local, et met à jour la ligne `users` avec la nouvelle URL locale.
//   node scripts/migrate-avatars.mjs
import { readFileSync } from 'fs';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import pkg from 'pg';
const { Client } = pkg;

function env(key) {
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && m[1] === key) return m[2].replace(/^["']|["']$/g, '');
  }
  return '';
}

const AVATARS_DIR = path.join(process.cwd(), 'uploads', 'avatars');
const URL_PREFIX = '/api/uploads/avatars/';

const tgt = new Client({ connectionString: env('DATABASE_URL') });
await tgt.connect();

const { rows } = await tgt.query(
  "select id, avatar_url from users where avatar_url like 'http%'"
);

console.log(`Avatars à migrer : ${rows.length}`);
await mkdir(AVATARS_DIR, { recursive: true });

for (const u of rows) {
  const res = await fetch(u.avatar_url);
  if (!res.ok) {
    console.log(`  ❌ ${u.id} : téléchargement échoué (${res.status})`);
    continue;
  }
  const ext = u.avatar_url.split('.').pop().split('?')[0].toLowerCase();
  const filename = `${u.id}.${ext}`;
  const buffer = Buffer.from(await res.arrayBuffer());
  await writeFile(path.join(AVATARS_DIR, filename), buffer);

  const newUrl = `${URL_PREFIX}${filename}`;
  await tgt.query('update users set avatar_url = $1 where id = $2', [newUrl, u.id]);
  console.log(`  ✅ ${u.id} → ${filename} (${buffer.length} octets)`);
}

await tgt.end();
console.log('\n✅ Migration des avatars terminée.');
