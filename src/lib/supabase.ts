import { createBrowserClient } from "@supabase/ssr"

export const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://yumaxzevfkcctxwdbcni.supabase.co"
export const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "your_anon_key_here"

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
