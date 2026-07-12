import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema';

const { Pool, types } = pg;

// pg renvoie numeric/bigint comme des strings ; on les repasse en nombres JS
// (comme le faisait Supabase) pour éviter que le code reçoive du texte.
// Les montants de l'app tiennent dans un Number sans perte de précision.
types.setTypeParser(1700, (v) => (v === null ? null : parseFloat(v))); // numeric
types.setTypeParser(20, (v) => (v === null ? null : Number(v)));       // bigint / int8

// Pool unique réutilisé entre les rechargements à chaud (dev) et les invocations.
const g = globalThis;
const pool = g.__epicoPool ?? new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
});
g.__epicoPool = pool;

export const db = drizzle(pool, { schema });
