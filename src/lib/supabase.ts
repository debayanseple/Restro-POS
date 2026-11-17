import { createBrowserClient } from "@supabase/ssr"

export const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  "https://yumaxzevfkcctxwdbcni.supabase.co"

export const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_HUUcCLl9c9eJhQ1A_n09mQ_77AC_mg6"

export const isSupabaseConfigured = () => {
  return (
    typeof supabaseAnonKey === "string" &&
    supabaseAnonKey.trim() !== "" &&
    supabaseAnonKey !== "your_anon_key_here" &&
    supabaseAnonKey !== "placeholder-anon-key" &&
    supabaseAnonKey.length > 20
  )
}

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)
export const supabaseBrowser = supabase

export function getSupabaseBrowserClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

export const createClient = () => createBrowserClient(supabaseUrl, supabaseAnonKey)
