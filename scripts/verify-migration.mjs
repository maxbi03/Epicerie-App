// Vérifie la parité source (Supabase) ↔ cible (local) après migration.
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

const TABLES = ['users', 'producers', 'producer_deliveries', 'producer_invoices',
  'producer_proposals', 'product_list', 'news', 'sales', 'reports', 'saved_lists',
  'bulk_orders', 'traffic', 'login_attempts'];

const src = new Client({ connectionString: env('SUPABASE_DB_URL').replace(/([?&])sslmode=[^&]*/, '').replace(/[?&]$/, ''), ssl: { rejectUnauthorized: false } });
const tgt = new Client({ connectionString: env('DATABASE_URL') });
await src.connect(); await tgt.connect();

const one = async (c, sql) => (await c.query(sql)).rows[0];
let allOk = true;
const mark = (ok) => { if (!ok) allOk = false; return ok ? 'OK' : '❌ DIFF'; };

console.log('Table                 source   cible');
for (const t of TABLES) {
  const s = (await src.query(`select count(*)::int n from public."${t}"`)).rows[0].n;
  const d = (await tgt.query(`select count(*)::int n from public."${t}"`)).rows[0].n;
  console.log(`${t.padEnd(20)} ${String(s).padStart(6)}  ${String(d).padStart(6)}  ${mark(s === d)}`);
}

console.log('\nAgrégats sensibles :');
// price_chf : source en text, cible en numeric — on compare somme + nb non-nuls
const sPrice = await one(src, `select count(*) filter (where btrim(price_chf) ~ '^[0-9.]+$') n, coalesce(sum(nullif(btrim(price_chf),'')::numeric),0) s from product_list`);
const dPrice = await one(tgt, `select count(*) filter (where price_chf is not null) n, coalesce(sum(price_chf),0) s from product_list`);
console.log(`product_list price_chf  non-nuls ${sPrice.n}/${dPrice.n} ${mark(sPrice.n == dPrice.n)}   somme ${Number(sPrice.s).toFixed(2)}/${Number(dPrice.s).toFixed(2)} ${mark(Number(sPrice.s).toFixed(2) === Number(dPrice.s).toFixed(2))}`);

const sTs = await one(src, `select coalesce(sum(total_spent),0) s from users`);
const dTs = await one(tgt, `select coalesce(sum(total_spent),0) s from users`);
console.log(`users total_spent somme  ${Number(sTs.s).toFixed(2)}/${Number(dTs.s).toFixed(2)} ${mark(Number(sTs.s).toFixed(2) === Number(dTs.s).toFixed(2))}`);

const sSales = await one(src, `select coalesce(sum(price),0) s from sales`);
const dSales = await one(tgt, `select coalesce(sum(price),0) s from sales`);
console.log(`sales price somme        ${sSales.s}/${dSales.s} ${mark(String(sSales.s) === String(dSales.s))}`);

await src.end(); await tgt.end();
console.log(allOk ? '\n✅ Parité vérifiée.' : '\n❌ Écart détecté, voir ci-dessus.');
process.exit(allOk ? 0 : 1);
