// Creates (or updates) one or two admin accounts and links each to a
// participant row marked is_admin. Run with:  npm run create-admin
// Safe to re-run — existing accounts are updated, not duplicated.
import { createClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey || serviceKey.includes('PASTE_')) {
  console.error('❌ Missing Supabase URL or SERVICE_ROLE key in .env')
  process.exit(1)
}

// Collect all admins defined in .env (ADMIN_*, ADMIN2_*, etc.)
const admins = []
for (const n of ['', '2']) {
  const prefix = `ADMIN${n}_`
  const email = process.env[`${prefix}EMAIL`]
  const password = process.env[`${prefix}PASSWORD`]
  const name = process.env[`${prefix}NAME`] ?? 'Admin'
  if (!email || email.includes('_HERE')) continue
  if (!password || password.includes('CHOOSE_A_PASSWORD')) {
    console.warn(`⚠️  Skipping ${email}: ADMIN${n}_PASSWORD not set.`)
    continue
  }
  admins.push({ email, password, name })
}

if (admins.length === 0) {
  console.error('❌ No admin accounts configured in .env. Fill in ADMIN_EMAIL + ADMIN_PASSWORD.')
  process.exit(1)
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })

async function ensureAdminUser({ email, password, name }) {
  let userId

  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (createErr) {
    if (/already|exists|registered/i.test(createErr.message)) {
      const { data: list, error: listErr } = await supabase.auth.admin.listUsers()
      if (listErr) throw new Error(listErr.message)
      const existing = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
      if (!existing) throw new Error(`User ${email} exists but could not be found.`)
      userId = existing.id
      await supabase.auth.admin.updateUserById(userId, { password })
      console.log(`ℹ️  ${email} already existed — password updated.`)
    } else {
      throw new Error(createErr.message)
    }
  } else {
    userId = created.user.id
    console.log(`✅ Created auth user for ${email}.`)
  }

  const { error: upsertErr } = await supabase
    .from('participants')
    .upsert({ name, is_admin: true, auth_user_id: userId }, { onConflict: 'auth_user_id' })

  if (upsertErr) throw new Error(upsertErr.message)
  console.log(`✅ ${name} (${email}) is set up as admin. Log in at /admin.`)
}

for (const admin of admins) {
  try {
    await ensureAdminUser(admin)
  } catch (err) {
    console.error(`❌ Failed for ${admin.email}:`, err.message)
    process.exit(1)
  }
}
