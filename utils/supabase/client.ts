import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://yumaxzevfkcctxwdbcni.supabase.co";
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_HUUcCLl9c9eJhQ1A_n09mQ_77AC_mg6";

export const createClient = () =>
  createBrowserClient(
    supabaseUrl,
    supabaseKey,
  );
