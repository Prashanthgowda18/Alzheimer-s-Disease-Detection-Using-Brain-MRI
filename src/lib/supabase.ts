import { createClient } from '@supabase/supabase-js';

// Read values from process.env (server) or import.meta.env (client/bundler)
const supabaseUrl = 
  (typeof process !== 'undefined' ? process.env.SUPABASE_URL : null) || 
  (import.meta.env ? import.meta.env.VITE_SUPABASE_URL : '') || 
  '';

const supabaseAnonKey = 
  (typeof process !== 'undefined' ? process.env.SUPABASE_ANON_KEY : null) || 
  (import.meta.env ? import.meta.env.VITE_SUPABASE_ANON_KEY : '') || 
  '';

const supabaseServiceRole = 
  (typeof process !== 'undefined' ? process.env.SUPABASE_SERVICE_ROLE_KEY : null) || 
  '';

export const isSupabaseConfigured = !!supabaseUrl && supabaseUrl !== 'https://placeholder.supabase.co' && !!supabaseAnonKey;

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

export const supabaseAdmin = supabaseServiceRole
  ? createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseServiceRole)
  : supabase;
