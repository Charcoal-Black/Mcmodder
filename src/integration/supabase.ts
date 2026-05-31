import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Mcmodder } from '../Mcmodder';

export class SupabaseUtils {
  private static readonly supabaseUrl = "https://kjghwgrbawdtatyrrxin.supabase.co";
  private static readonly supabaseKey = "sb_publishable_yQ4SlDDDQ8OE8tgbnLrkNw_deH9GSjd";
  

  private readonly parent: Mcmodder;
  private readonly instance: SupabaseClient | null;

  constructor(parent: Mcmodder) {
    this.parent = parent;

    if (!this.parent.utils.getConfig("useSupabase")) {
      this.instance = null;
    }

    else try {
      this.instance = createClient(
        SupabaseUtils.supabaseUrl,
        SupabaseUtils.supabaseKey, {
          auth: {
            persistSession: false
          }
        }
      );
    }
    catch (e) {
      this.instance = null;
    }
  }

  getClient() {
    return this.instance;
  }
}
