import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { publicPlanFromRow, type PublicPlan } from "./public-plan-rules";

export const getPublicPlans = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ plans: PublicPlan[]; unavailable: boolean }> => {
    const url = process.env["SUPABASE_URL"];
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
    if (!url || !key) return { plans: [], unavailable: true };
    const client = createClient<Database>(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: {
        fetch: (input, init) => {
          const headers = new Headers(init?.headers);
          if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
            headers.delete("Authorization");
          }
          headers.set("apikey", key);
          return fetch(input, { ...init, headers, signal: AbortSignal.timeout(10_000) });
        },
      },
    });
    try {
      const { data, error } = await client.from("plan")
        .select("slug,nome,preco_cents,descricao,features,destaque,trial_days,is_free,free_days")
        .eq("ativo", true).order("ordem");
      if (error) return { plans: [], unavailable: true };
      return { plans: (data ?? []).map(publicPlanFromRow), unavailable: false };
    } catch {
      return { plans: [], unavailable: true };
    }
  },
);