import { defineConfig } from 'drizzle-kit';
import { readFileSync } from 'fs';

// Charge DATABASE_URL depuis .env.local (drizzle-kit ne le lit pas tout seul).
function loadEnv(key: string): string | undefined {
  try {
    for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && m[1] === key) return m[2].replace(/^["']|["']$/g, '');
    }
  } catch { /* pas de .env.local */ }
  return undefined;
}

// On retire un éventuel sslmode= de l'URL : sur Supabase il serait interprété en
// 'verify-full' (vérif stricte du certificat) qui bloque. Le SSL est géré en objet.
const url = (loadEnv('DATABASE_URL') ?? '').replace(/([?&])sslmode=[^&]*/, '').replace(/[?&]$/, '');
const isLocal = /@(localhost|127\.0\.0\.1|postgres)[:/]/.test(url);

export default defineConfig({
  dialect: 'postgresql',
  out: './drizzle',
  schema: './app/lib/db/schema.ts',
  dbCredentials: isLocal ? { url } : { url, ssl: { rejectUnauthorized: false } },
  schemaFilter: ['public'],
});
