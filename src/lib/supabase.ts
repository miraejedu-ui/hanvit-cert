import { createClient, SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  // Legacy service_role (eyJ...) or new secret key (sb_secret_...)
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase 환경변수가 없습니다. NEXT_PUBLIC_SUPABASE_URL 와 SUPABASE_SERVICE_ROLE_KEY(또는 SUPABASE_SECRET_KEY) 를 설정하세요."
    );
  }
  if (!client) {
    client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

export const UPLOAD_BUCKET = "uploads";
