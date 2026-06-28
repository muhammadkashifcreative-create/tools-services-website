import { createServerFn } from "@tanstack/react-start";
import { requireDirectAuth as requireSupabaseAuth, ADMIN_EMAIL } from "@/lib/direct-auth-middleware.server";

const TABLES = [
  `create table if not exists app_settings (key text primary key, value jsonb not null)`,
  `create table if not exists profiles (id uuid references auth.users on delete cascade primary key, username text unique, full_name text, balance numeric(10,4) default 0 not null, created_at timestamptz default now() not null)`,
  `create table if not exists user_roles (id uuid default gen_random_uuid() primary key, user_id uuid references auth.users on delete cascade not null, role text not null, created_at timestamptz default now() not null, unique(user_id, role))`,
  `create table if not exists services (id uuid default gen_random_uuid() primary key, provider_service_id text unique not null, name text not null, category text, platform text, type text, rate numeric(10,4) default 0 not null, min_quantity integer default 1 not null, max_quantity integer default 100000 not null, description text, is_active boolean default true not null, provider_rate numeric(10,6) default 0 not null, created_at timestamptz default now() not null)`,
  `create table if not exists orders (id uuid default gen_random_uuid() primary key, user_id uuid references auth.users on delete cascade not null, service_id uuid references services on delete set null, link text not null, quantity integer not null, charge numeric(10,4) not null, status text default 'pending' not null, provider_order_id text, start_count text, remains text, created_at timestamptz default now() not null)`,
  `create table if not exists transactions (id uuid default gen_random_uuid() primary key, user_id uuid references auth.users on delete cascade not null, amount numeric(10,4) not null, type text not null, description text, created_at timestamptz default now() not null)`,
  `create table if not exists tool_orders (id uuid default gen_random_uuid() primary key, user_id uuid references auth.users on delete cascade not null, product_id text not null, product_name text not null, qty integer not null, unit_price numeric(10,4) not null, total_price numeric(10,4) not null, codes jsonb default '[]' not null, status text default 'completed' not null, created_at timestamptz default now() not null)`,
  `create table if not exists cases (id uuid default gen_random_uuid() primary key, user_id uuid references auth.users on delete cascade not null, subject text not null, category text not null, priority text default 'normal' not null, status text default 'open' not null, order_id uuid references orders on delete set null, last_activity_at timestamptz default now() not null, created_at timestamptz default now() not null)`,
  `create table if not exists case_messages (id uuid default gen_random_uuid() primary key, case_id uuid references cases on delete cascade not null, user_id uuid references auth.users on delete cascade not null, body text not null, is_staff boolean default false not null, created_at timestamptz default now() not null)`,
];

const TRIGGER_SQL = `
create or replace function handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, full_name) values (new.id, new.raw_user_meta_data->>'name') on conflict (id) do nothing;
  return new;
end; $$ language plpgsql security definer;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure handle_new_user();
`;

async function runSql(projectRef: string, serviceKey: string, query: string) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ query }),
    },
  );
  const json = await res.json() as { error?: string; message?: string };
  if (!res.ok) throw new Error(json?.error ?? json?.message ?? `SQL failed (${res.status})`);
  return json;
}

export const runDatabaseMigration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if ((context as { email?: string }).email !== ADMIN_EMAIL) throw new Error("Forbidden");

    const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

    if (!supabaseUrl || !serviceKey) {
      throw new Error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set in Vercel env vars.");
    }

    // Extract project ref from URL: https://hlitnwnwmypkjlroitvj.supabase.co
    const projectRef = supabaseUrl.replace("https://", "").split(".")[0];

    const errors: string[] = [];
    for (const sql of TABLES) {
      try { await runSql(projectRef, serviceKey, sql); } catch (e) { errors.push(String(e)); }
    }
    try { await runSql(projectRef, serviceKey, TRIGGER_SQL); } catch (e) { errors.push(String(e)); }

    if (errors.length > 0 && errors.length === TABLES.length + 1) {
      throw new Error(`Migration failed: ${errors[0]}`);
    }

    return {
      ok: true,
      message: `Database setup complete. ${TABLES.length - errors.length + 1} of ${TABLES.length + 1} statements succeeded.`,
    };
  });
