/**
 * Central Supabase configuration — single source of truth.
 *
 * Values come ONLY from environment variables. Never hardcode project URLs or
 * keys here; provide them via .env / deployment environment (see .env.example).
 *
 * NEXT_PUBLIC_SUPABASE_URL           — required for browser + server clients
 * NEXT_PUBLIC_SUPABASE_ANON_KEY      — required (publishable/anon key)
 * ALLOW_DEMO_LOGIN                   — "true" enables the demo login fallback
 * DEMO_LOGIN_PASSWORD                — password accepted by the demo login
 */

export const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  ""

export const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  ""

export const isSupabaseConfigured = () =>
  supabaseUrl.startsWith("http") && supabaseAnonKey.trim().length > 20

/** Demo login is opt-in. Enable ONLY in development/demo environments. */
export const isDemoLoginEnabled = () =>
  process.env.ALLOW_DEMO_LOGIN === "true"

export const demoLoginPassword = process.env.DEMO_LOGIN_PASSWORD || "demo1234"
