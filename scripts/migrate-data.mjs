// Migration des données Supabase (source) → Postgres local (cible).
// Lit SUPABASE_DB_URL et DATABASE_URL depuis .env.local. Re-jouable (TRUNCATE au début).
//   node scripts/migrate-data.mjs
import { readFileSync } from 'fs';
import pkg from 'pg';
const { Client } = pkg;

function env(key) {
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && m[1] === key) return m[2].replace(/^["']|["']$/g, '');
  }
  return '';
}
const q = (id) => '"' + id.replace(/"/g, '""') + '"';
const EMPTY_TO_NULL = new Set([
  'numeric', 'integer', 'bigint', 'smallint', 'double precision', 'real',
  'date', 'timestamp with time zone', 'timestamp without time zone', 'boolean',
]);

// Ordre = parents avant enfants (contraintes FK)
const TABLES = [
  { name: 'users' },
  { name: 'producers' },
  { name: 'producer_deliveries' },
  { name: 'producer_invoices' },
  { name: 'producer_proposals' },
  { name: 'product_list', rename: {
      prix_unit_chf: 'Prix unit. [CHF]',
      nbre_articles: 'Nbre. articles',
      lot: 'Lot',
      prix_achat_chf: "Prix d'achat [CHF]",
    } },
  { name: 'news' },
  { name: 'sales' },
  { name: 'reports' },
  { name: 'saved_lists' },
  { name: 'bulk_orders' },
  { name: 'traffic' },
  { name: 'login_attempts' },
];

const srcUrl = env('SUPABASE_DB_URL').replace(/([?&])sslmode=[^&]*/, '').replace(/[?&]$/, '');
const src = new Client({ connectionString: srcUrl, ssl: { rejectUnauthorized: false } });
const tgt = new Client({ connectionString: env('DATABASE_URL') });

await src.connect();
await tgt.connect();

// 1. Vider les tables cibles
await tgt.query(`truncate table ${TABLES.map(t => 'public.' + q(t.name)).join(', ')} restart identity cascade`);

// 2. Copier table par table
for (const t of TABLES) {
  const { rows: cols } = await tgt.query(
    `select column_name, data_type from information_schema.columns
     where table_schema='public' and table_name=$1 order by ordinal_position`, [t.name]);
  const targetCols = cols.map(c => c.column_name);
  const typeOf = Object.fromEntries(cols.map(c => [c.column_name, c.data_type]));
  const rename = t.rename || {};
  const sourceCols = targetCols.map(tc => rename[tc] || tc);

  const { rows: srcRows } = await src.query(
    `select ${sourceCols.map(q).join(', ')} from public.${q(t.name)}`);

  let inserted = 0;
  for (const row of srcRows) {
    const values = targetCols.map((tc, i) => {
      let v = row[sourceCols[i]];
      const type = typeOf[tc];
      if (v === '' && EMPTY_TO_NULL.has(type)) v = null;
      if (type === 'jsonb' && v != null && typeof v === 'object') v = JSON.stringify(v);
      return v;
    });
    const ph = values.map((_, i) => `$${i + 1}`).join(', ');
    const r = await tgt.query(
      `insert into public.${q(t.name)} (${targetCols.map(q).join(', ')}) values (${ph}) on conflict do nothing`,
      values);
    inserted += r.rowCount;
  }
  const skipped = srcRows.length - inserted;
  console.log(`${t.name.padEnd(20)} source=${srcRows.length}  inséré=${inserted}${skipped ? `  ⚠️ ignoré=${skipped}` : ''}`);
}

// 3. Recaler la séquence d'identité de sales
await tgt.query(`select setval(pg_get_serial_sequence('public.sales','id'), coalesce((select max(id) from public.sales), 1))`);

await src.end();
await tgt.end();
console.log('\n✅ Migration des données terminée.');
