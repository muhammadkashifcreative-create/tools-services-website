import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

export const listServices = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = publicClient();
  const pageSize = 1000;
  let from = 0;
  const all: any[] = [];
  // Paginate past PostgREST's default 1000-row cap.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data, error } = await supabase
      .from("services")
      .select("id, provider_service_id, name, category, platform, type, rate, min_quantity, max_quantity, description")
      .eq("is_active", true)
      .order("platform", { ascending: true })
      .order("name", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all.map((s) => ({
    ...s,
    name: sanitizeText(s.name),
    description: s.description ? sanitizeText(s.description) : null,
    category: s.category ? sanitizeText(s.category) : null,
  }));
});

export const syncServicesFromProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin, error: roleErr } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleErr) throw new Error(roleErr.message);
    if (!isAdmin) throw new Error("Forbidden");

    const { fetchServices } = await import("./famousprovider.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getFxRatesUSDBase } = await import("./fx.server");

    const services = await fetchServices();
    // Provider rates are quoted in INR. Convert to USD so the DB stores a
    // canonical USD price; user-facing pages convert from USD to local currency.
    const fx = await getFxRatesUSDBase();
    const inrPerUsd = Number(fx.INR) > 0 ? Number(fx.INR) : 83.2;

    const { data: settings } = await supabaseAdmin
      .from("app_settings")
      .select("value")
      .eq("key", "markup_percent")
      .maybeSingle();
    const markupPct = Number((settings?.value as unknown as number) ?? 25);

    const rows = services.map((s) => {
      const rawRate = Number(s.rate);
      const providerRateInr = Number.isFinite(rawRate) && rawRate >= 0 ? Math.min(rawRate, 9_999_999) : 0;
      // Convert INR → USD, then apply markup.
      const providerRate = +(providerRateInr / inrPerUsd).toFixed(6);
      const computed = providerRate * (1 + markupPct / 100);
      const rate = +(Number.isFinite(computed) ? Math.min(computed, 9_999_999) : 0).toFixed(4);
      const min = Math.max(1, Math.min(Number(s.min) || 1, 2_000_000_000));
      const max = Math.max(min, Math.min(Number(s.max) || 100000, 2_000_000_000));
      const name = sanitizeText(String(s.name ?? ""));
      const category = s.category ? sanitizeText(String(s.category)) : null;
      const platform = detectPlatform(name, category);
      return {
        provider_service_id: String(s.service),
        name,
        category,
        platform,
        type: s.type ? sanitizeText(String(s.type)) : null,
        description: s.description ? sanitizeText(String(s.description)) : null,
        provider_rate: providerRate,
        rate,
        min_quantity: min,
        max_quantity: max,
        is_active: true,
      };
    }).filter((r) => r.provider_service_id && r.name);

    // Upsert in chunks to keep payloads small and isolate bad rows
    const chunkSize = 500;
    let inserted = 0;
    const errors: string[] = [];
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const { error } = await supabaseAdmin
        .from("services")
        .upsert(chunk, { onConflict: "provider_service_id" });
      if (error) {
        errors.push(error.message);
      } else {
        inserted += chunk.length;
      }
    }
    if (inserted === 0 && errors.length) throw new Error(errors[0]);

    return { count: inserted, skipped: rows.length - inserted, errors: errors.slice(0, 3) };
  });

function detectPlatform(name: string, category: string | null): string {
  const hay = `${name} ${category ?? ""}`.toLowerCase();
  const map: Array<[string, string]> = [
    ["instagram", "Instagram"],
    ["tiktok", "TikTok"],
    ["youtube", "YouTube"],
    ["facebook", "Facebook"],
    ["twitter", "X (Twitter)"],
    [" x ", "X (Twitter)"],
    ["linkedin", "LinkedIn"],
    ["telegram", "Telegram"],
    ["spotify", "Spotify"],
    ["twitch", "Twitch"],
    ["google", "Google Maps"],
    ["maps", "Google Maps"],
    ["snapchat", "Snapchat"],
    ["threads", "Threads"],
    ["discord", "Discord"],
    ["pinterest", "Pinterest"],
    ["soundcloud", "SoundCloud"],
    ["reddit", "Reddit"],
  ];
  for (const [k, v] of map) if (hay.includes(k)) return v;
  return "Other";
}

// Strip provider names, URLs, contact info, and noisy marketing wording so the
// catalog reads cleanly to end users.
function sanitizeText(input: string): string {
  if (!input) return input;
  let out = input;
  // Remove URLs and emails
  out = out.replace(/https?:\/\/\S+/gi, "");
  out = out.replace(/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/gi, "");
  // Remove specific provider brand mentions
  const banned = [
    /\bfamous\s*provider\b/gi,
    /\bfamousprovider(?:\.com)?\b/gi,
    /\bsmm\s*panel\b/gi,
    /\bpanel\b/gi,
    /\bprovider\b/gi,
    /\bapi\b/gi,
    /\bre-?sell(?:er|ing)?\b/gi,
  ];
  for (const re of banned) out = out.replace(re, "");
  // Collapse leftover punctuation noise and whitespace
  out = out.replace(/\s*[-–—|•·:]{1,}\s*$/g, "");
  out = out.replace(/\(\s*\)/g, "");
  out = out.replace(/\[\s*\]/g, "");
  out = out.replace(/\s{2,}/g, " ").trim();
  return out;
}

export const getMarkup = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = publicClient();
  const { data } = await supabase.from("app_settings").select("value").eq("key", "markup_percent").maybeSingle();
  return { markup: Number((data?.value as unknown as number) ?? 25) };
});

export const updateMarkup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ markup: z.number().min(0).max(500) }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("app_settings").upsert({
      key: "markup_percent",
      value: data.markup as unknown as never,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });