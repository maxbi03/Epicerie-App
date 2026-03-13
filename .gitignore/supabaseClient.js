// supabaseClient.js
// Client Supabase unique partagé par toute l'app

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

export const SUPABASE_URL = 'https://jykfgstmcmhhhluzojxb.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_aE4PA7Vz2K3R4Btw-mAm8g_M_7ONE7_';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ✅ Exposer en global pour debug (console) + compat éventuelle scripts non-module
// (ne change rien au fonctionnement "module", ça ajoute juste window.supabase)
window.supabase = supabase;