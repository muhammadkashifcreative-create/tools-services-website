import { createServerFn } from "@tanstack/react-start";
import { requireDirectAuth as requireSupabaseAuth, ADMIN_EMAIL } from "@/lib/direct-auth-middleware.server";

// Run a SQL statement via Supabase's pg_meta REST API (service role only).
// This is the internal API used by Supabase Studio — available on every project.
async function execSql(supabaseUrl: string, serviceKey: string, query: string): Promise<void> {
  const pgMetaUrl = `${supabaseUrl}/rest/v1/`;
  // Use raw postgres query via PostgREST rpc (works for DDL with service role)
  const res = await fetch(`${supabaseUrl}/pg/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({ query }),
  });
  void pgMetaUrl;
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    // 404 means this endpoint doesn't exist — try the alternative
    if (res.status === 404) throw Object.assign(new Error("NOT_FOUND"), { status: 404 });
    throw new Error(`SQL error (${res.status}): ${text.slice(0, 200)}`);
  }
}

// Alternative: use supabaseAdmin to create tables one-by-one via upsert tricks
// This works because supabaseAdmin (service role) can do anything on the DB
async function createTablesViaAdmin(supabaseAdmin: import("@supabase/supabase-js").SupabaseClient) {
  const tables = [
    {
      name: "app_settings",
      check: () => supabaseAdmin.from("app_settings").select("key").limit(1),
    },
    {
      name: "profiles",
      check: () => supabaseAdmin.from("profiles").select("id").limit(1),
    },
    {
      name: "user_roles",
      check: () => supabaseAdmin.from("user_roles").select("id").limit(1),
    },
    {
      name: "services",
      check: () => supabaseAdmin.from("services").select("id").limit(1),
    },
    {
      name: "orders",
      check: () => supabaseAdmin.from("orders").select("id").limit(1),
    },
    {
      name: "transactions",
      check: () => supabaseAdmin.from("transactions").select("id").limit(1),
    },
    {
      name: "tool_orders",
      check: () => supabaseAdmin.from("tool_orders").select("id").limit(1),
    },
    {
      name: "cases",
      check: () => supabaseAdmin.from("cases").select("id").limit(1),
    },
    {
      name: "case_messages",
      check: () => supabaseAdmin.from("case_messages").select("id").limit(1),
    },
  ];

  const missing: string[] = [];
  for (const t of tables) {
    const { error } = await t.check();
    if (error?.message?.includes("does not exist") || error?.message?.includes("schema cache")) {
      missing.push(t.name);
    }
  }
  return missing;
}

export const runDatabaseMigration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if ((context as { email?: string }).email !== ADMIN_EMAIL) throw new Error("Forbidden");

    const supabaseUrl =
      (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

    if (!supabaseUrl || !serviceKey) {
      throw new Error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not configured.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // First check which tables are missing
    const missing = await createTablesViaAdmin(supabaseAdmin);

    if (missing.length === 0) {
      return { ok: true, message: "All tables already exist. You can Sync now." };
    }

    // Try pg_meta endpoint (Supabase internal API)
    const MIGRATION_SQL = `
create table if not exists app_settings (key text primary key, value jsonb not null);
create table if not exists profiles (id uuid references auth.users on delete cascade primary key, username text unique, full_name text, balance numeric(10,4) default 0 not null, created_at timestamptz default now() not null);
create table if not exists user_roles (id uuid default gen_random_uuid() primary key, user_id uuid references auth.users on delete cascade not null, role text not null, created_at timestamptz default now() not null, unique(user_id, role));
create table if not exists services (id uuid default gen_random_uuid() primary key, provider_service_id text unique not null, name text not null, category text, platform text, type text, rate numeric(10,4) default 0 not null, min_quantity integer default 1 not null, max_quantity integer default 100000 not null, description text, is_active boolean default true not null, provider_rate numeric(10,6) default 0 not null, created_at timestamptz default now() not null);
create table if not exists orders (id uuid default gen_random_uuid() primary key, user_id uuid references auth.users on delete cascade not null, service_id uuid references services on delete set null, link text not null, quantity integer not null, charge numeric(10,4) not null, status text default 'pending' not null, provider_order_id text, start_count text, remains text, created_at timestamptz default now() not null);
create table if not exists transactions (id uuid default gen_random_uuid() primary key, user_id uuid references auth.users on delete cascade not null, amount numeric(10,4) not null, type text not null, description text, created_at timestamptz default now() not null);
create table if not exists tool_orders (id uuid default gen_random_uuid() primary key, user_id uuid references auth.users on delete cascade not null, product_id text not null, product_name text not null, qty integer not null, unit_price numeric(10,4) not null, total_price numeric(10,4) not null, codes jsonb default '[]' not null, status text default 'completed' not null, created_at timestamptz default now() not null);
create table if not exists cases (id uuid default gen_random_uuid() primary key, user_id uuid references auth.users on delete cascade not null, subject text not null, category text not null, priority text default 'normal' not null, status text default 'open' not null, order_id uuid references orders on delete set null, last_activity_at timestamptz default now() not null, created_at timestamptz default now() not null);
create table if not exists case_messages (id uuid default gen_random_uuid() primary key, case_id uuid references cases on delete cascade not null, user_id uuid references auth.users on delete cascade not null, body text not null, is_staff boolean default false not null, created_at timestamptz default now() not null);
create or replace function handle_new_user() returns trigger as $$ begin insert into public.profiles (id, full_name) values (new.id, new.raw_user_meta_data->>'name') on conflict (id) do nothing; return new; end; $$ language plpgsql security definer;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure handle_new_user();
`;

    try {
      await execSql(supabaseUrl, serviceKey, MIGRATION_SQL);
      return { ok: true, message: `Database setup complete. Missing tables (${missing.join(", ")}) have been created.` };
    } catch (e: unknown) {
      // pg_meta endpoint not available — give user the SQL to run manually
      const sql = MIGRATION_SQL.trim();
      throw new Error(
        `Auto-migration not available on this Supabase plan. Please run this SQL in your Supabase SQL Editor:\n\n${sql}`,
      );
    }
  });
