// Centralisation du client Supabase (utilisé par toute l'app)
// -----------------------------------------------------------------
// Objectif : éviter de dupliquer l'URL + clé dans plusieurs fichiers.
// Usage : import { supabase } from './supabaseClient.js';

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

export const SUPABASE_URL = 'https://jykfgstmcmhhhluzojxb.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_aE4PA7Vz2K3R4Btw-mAm8g_M_7ONE7_';

// Instance unique partagée
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);