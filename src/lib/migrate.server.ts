import { createServerFn } from "@tanstack/react-start";
import { requireDirectAuth as requireSupabaseAuth, ADMIN_EMAIL } from "@/lib/direct-auth-middleware.server";

const ALL_TABLES = [
  "app_settings",
  "profiles",
  "user_roles",
  "transactions",
  "tool_orders",
  "cases",
  "case_messages",
  "deposits",
];

export const runDatabaseMigration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if ((context as { email?: string }).email !== ADMIN_EMAIL) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Check which tables exist by querying each one
    const missing: string[] = [];
    for (const table of ALL_TABLES) {
      const { error } = await supabaseAdmin.from(table as "services").select("*").limit(1);
      if (error?.message?.includes("does not exist") || error?.message?.includes("schema cache")) {
        missing.push(table);
      }
    }

    if (missing.length === 0) {
      return {
        ok: true,
        message: "All tables exist. Database is ready.",
        missing: [],
      };
    }

    // Tables are missing — return the SQL for the user to run in Supabase SQL Editor
    return {
      ok: false,
      missing,
      message: `${missing.length} table(s) missing: ${missing.join(", ")}. Run the SQL below in your Supabase SQL Editor (supabase.com → SQL Editor).`,
      sql: `-- Run this in Supabase SQL Editor
create table if not exists app_settings (key text primary key, value jsonb not null);
create table if not exists profiles (id uuid references auth.users on delete cascade primary key, username text unique, full_name text, balance numeric(10,4) default 0 not null, created_at timestamptz default now() not null);
create table if not exists user_roles (id uuid default gen_random_uuid() primary key, user_id uuid references auth.users on delete cascade not null, role text not null, created_at timestamptz default now() not null, unique(user_id, role));
create table if not exists transactions (id uuid default gen_random_uuid() primary key, user_id uuid references auth.users on delete cascade not null, amount numeric(10,4) not null, type text not null, description text, created_at timestamptz default now() not null);
create table if not exists tool_orders (id uuid default gen_random_uuid() primary key, user_id uuid references auth.users on delete cascade not null, product_id text not null, product_name text not null, qty integer not null, unit_price numeric(10,4) not null, total_price numeric(10,4) not null, codes jsonb default '[]' not null, status text default 'completed' not null, created_at timestamptz default now() not null);
create table if not exists cases (id uuid default gen_random_uuid() primary key, user_id uuid references auth.users on delete cascade not null, subject text not null, category text not null, priority text default 'normal' not null, status text default 'open' not null, order_id uuid, last_activity_at timestamptz default now() not null, created_at timestamptz default now() not null);
create table if not exists case_messages (id uuid default gen_random_uuid() primary key, case_id uuid references cases on delete cascade not null, user_id uuid references auth.users on delete cascade not null, body text not null, is_staff boolean default false not null, created_at timestamptz default now() not null);
create table if not exists deposits (id uuid default gen_random_uuid() primary key, user_id uuid references auth.users on delete cascade not null, amount_usd numeric(12,4) not null check (amount_usd > 0), credited_usd numeric(12,4), status text default 'pending' not null, provider text default 'heleket' not null, provider_uuid text, payment_url text, payer_currency text, txid text, created_at timestamptz default now() not null, updated_at timestamptz default now() not null);
create or replace function handle_new_user() returns trigger as $$ begin insert into public.profiles (id, full_name) values (new.id, new.raw_user_meta_data->>'name') on conflict (id) do nothing; return new; end; $$ language plpgsql security definer;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure handle_new_user();`,
    };
  });
