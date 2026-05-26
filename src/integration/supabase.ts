import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { GM_getValue } from '$';

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  try {
    const settings = JSON.parse(GM_getValue("mcmodderSettings") || "{}");
    if (settings.useSupabase === false) {
      return null;
    }
  } catch (e) {}

  if (supabaseInstance) {
    return supabaseInstance;
  }

  let supabaseUrl = "https://kjghwgrbawdtatyrrxin.supabase.co";
  let supabaseKey = "sb_publishable_yQ4SlDDDQ8OE8tgbnLrkNw_deH9GSjd";

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
