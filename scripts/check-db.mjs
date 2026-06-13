// Quick connectivity check. Run with:  npm run check-db
// It uses your .env (loaded by Node's --env-file flag) to query Supabase.
import { createClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL
const anonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey || url.includes('YOUR-PROJECT') || anonKey.includes('PASTE_')) {
  console.error('❌ .env is not filled in yet. Add your real Supabase URL and anon key, then re-run.')
  process.exit(1)
}

const supabase = createClient(url, anonKey)

const { count, error } = await supabase
  .from('matches')
  .select('*', { count: 'exact', head: true })

if (error) {
  console.error('❌ Could not read the "matches" table:', error.message)
  console.error('   Did you run supabase/schema.sql in the Supabase SQL Editor?')
  process.exit(1)
}

console.log('✅ Connected to Supabase. The "matches" table exists and has', count, 'rows.')
console.log('   (0 is expected for now — we import real fixtures in Stage 3.)')
