import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { GM_getValue } from '$';

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  let supabaseUrl = "";
  let supabaseKey = "";

  try {
    const settings = JSON.parse(GM_getValue("mcmodderSettings") || "{}");
    if (settings.customSupabaseUrl && settings.customSupabaseKey) {
      supabaseUrl = settings.customSupabaseUrl;
      supabaseKey = settings.customSupabaseKey;
    }
  } catch (e) {}

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  try {
    supabaseInstance = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false
      }
    });
    return supabaseInstance;
  } catch (e) {
    return null;
  }
}
