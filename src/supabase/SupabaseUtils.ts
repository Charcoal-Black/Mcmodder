import { createClient, FunctionInvokeOptions, SupabaseClient } from '@supabase/supabase-js';
import { Mcmodder } from '../Mcmodder';
import { SupabaseErrorResponse } from '../types';
import { McmodderUtils } from '../Utils';

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
      console.warn("Failed to create Supabase client!");
      this.instance = null;
    }
  }

  getClient() {
    return this.instance;
  }

  hasClient() {
    return !!this.instance;
  }

  async invoke<SupabaseSuccessfulResponse extends object>(
    functionName: string,
    options?: FunctionInvokeOptions,
    onErrorCallback?: (error: string) => void
  ) {
    const client = this.getClient();
    if (!client) {
      return;
    }
    const { data, error } = await client.functions.invoke<SupabaseSuccessfulResponse | SupabaseErrorResponse>(
      functionName, options
    );
    if (error || (data as SupabaseErrorResponse)?.error) {
      const errorMsg = (data as SupabaseErrorResponse)?.error ?? String(error);
      if (onErrorCallback) {
        onErrorCallback(errorMsg);
      } else {
        McmodderUtils.commonMsg(errorMsg, false);
      }
      return;
    }
    return data as SupabaseSuccessfulResponse;
  }
}
