import { createClient } from '@supabase/supabase-js'

// Shared course library — points to the original project's Supabase.
// Courses are public data: anyone can read and add courses.
// Personal rounds live in each user's own Supabase (see supabase.js).
export const sharedSupabase = createClient(
  import.meta.env.VITE_SHARED_SUPABASE_URL,
  import.meta.env.VITE_SHARED_SUPABASE_ANON_KEY
)
