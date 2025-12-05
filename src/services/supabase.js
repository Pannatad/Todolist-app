import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Debug: Check if environment variables are loaded
console.log('🔧 Supabase Config Debug:');
console.log('  URL:', supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : '❌ MISSING');
console.log('  Key:', supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : '❌ MISSING');

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase URL or Key is missing. App will run in Guest Mode (Local Storage only).');
}

export const supabase = (supabaseUrl && supabaseAnonKey)
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

