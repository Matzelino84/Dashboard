import { createClient } from '@supabase/supabase-js';

// Bei Vite (was du nutzt) MUSS import.meta.env verwendet werden.
// process.env würde hier in der Produktion auf Netlify abstürzen!
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);