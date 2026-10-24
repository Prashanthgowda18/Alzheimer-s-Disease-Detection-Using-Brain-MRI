import { createClient } from '@supabase/supabase-js';

// Read values from import.meta.env (Vite client) or process.env
const supabaseUrl = 
  (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_SUPABASE_URL : '') ||
  (typeof process !== 'undefined' && process.env ? process.env.SUPABASE_URL : '') || 
  '';

const supabaseAnonKey = 
  (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_SUPABASE_ANON_KEY : '') ||
  (typeof process !== 'undefined' && process.env ? process.env.SUPABASE_ANON_KEY : '') || 
  '';

export const isSupabaseConfigured = !!supabaseUrl && 
  supabaseUrl !== 'https://placeholder.supabase.co' && 
  !supabaseUrl.includes('placeholder') && 
  !!supabaseAnonKey && 
  !supabaseAnonKey.includes('placeholder');

export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl : 'https://placeholder.supabase.co',
  isSupabaseConfigured ? supabaseAnonKey : 'placeholder-key'
);

// In browser client builds, always safely reuse the public client to adhere to Row Level Security
export const supabaseAdmin = supabase;
