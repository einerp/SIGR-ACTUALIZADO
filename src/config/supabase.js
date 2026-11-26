const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = (process.env.SUPABASE_URL || '').trim();
const SUPABASE_KEY = (
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  ''
).trim();
const SUPABASE_STORAGE_BUCKET = (
  process.env.SUPABASE_STORAGE_BUCKET || 'productos-imagenes'
).trim();

const isPlaceholder =
  !SUPABASE_URL ||
  !SUPABASE_KEY ||
  SUPABASE_URL.includes('tu-proyecto.supabase.co') ||
  SUPABASE_KEY.includes('tu-service-role-key') ||
  SUPABASE_KEY.includes('tu-anon-key');

const isSupabaseConfigured = !isPlaceholder;

let supabase = null;

if (isSupabaseConfigured) {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

module.exports = {
  supabase,
  isSupabaseConfigured,
  SUPABASE_STORAGE_BUCKET
};
