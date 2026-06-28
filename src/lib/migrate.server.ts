import { createServerFn } from "@tanstack/react-start";
import { requireDirectAuth as requireSupabaseAuth, ADMIN_EMAIL } from "@/lib/direct-auth-middleware.server";

export const runDatabaseMigration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if ((context as { email?: string }).email !== ADMIN_EMAIL) throw new Error("Forbidden");

    const connStr =
      process.env.POSTGRES_URL_NON_POOLING ??
      process.env.POSTGRES_URL ??
      process.env.DATABASE_URL;

    if (!connStr) {
      throw new Error("POSTGRES_URL_NON_POOLING not found. It should be set automatically by the Vercel Supabase integration.");
    }

    // postgres is marked as Nitro external — loaded at runtime, not bundled
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const postgres = (await import("postgres" as any)).default ?? (await import("postgres" as any));
    const sql = postgres(connStr, { ssl: "require", max: 1, connect_timeout: 15 });

    try {
      await sql.unsafe(`
        create table if not exists app_settings (
          key text primary key,
          value jsonb not null
        );

        create table if not exists profiles (
          id uuid references auth.users on delete cascade primary key,
          username text unique,
          full_name text,
          balance numeric(10,4) default 0 not null,
          created_at timestamptz default now() not null
        );

        create table if not exists user_roles (
          id uuid default gen_random_uuid() primary key,
          user_id uuid references auth.users on delete cascade not null,
          role text not null,
          created_at timestamptz default now() not null,
          unique(user_id, role)
        );

        create table if not exists services (
          id uuid default gen_random_uuid() primary key,
          provider_service_id text unique not null,
          name text not null,
          category text,
          platform text,
          type text,
          rate numeric(14,6) default 0 not null,
          min_quantity integer default 1 not null,
          max_quantity integer default 100000 not null,
          description text,
          is_active boolean default true not null,
          provider_rate numeric(14,8) default 0 not null,
          created_at timestamptz default now() not null
        );

        create table if not exists orders (
          id uuid default gen_random_uuid() primary key,
          user_id uuid references auth.users on delete cascade not null,
          service_id uuid references services on delete set null,
          link text not null,
          quantity integer not null,
          charge numeric(10,4) not null,
          status text default 'pending' not null,
          provider_order_id text,
          start_count text,
          remains text,
          created_at timestamptz default now() not null
        );

        create table if not exists transactions (
          id uuid default gen_random_uuid() primary key,
          user_id uuid references auth.users on delete cascade not null,
          amount numeric(10,4) not null,
          type text not null,
          description text,
          created_at timestamptz default now() not null
        );

        create table if not exists tool_orders (
          id uuid default gen_random_uuid() primary key,
          user_id uuid references auth.users on delete cascade not null,
          product_id text not null,
          product_name text not null,
          qty integer not null,
          unit_price numeric(10,4) not null,
          total_price numeric(10,4) not null,
          codes jsonb default '[]' not null,
          status text default 'completed' not null,
          created_at timestamptz default now() not null
        );

        create table if not exists cases (
          id uuid default gen_random_uuid() primary key,
          user_id uuid references auth.users on delete cascade not null,
          subject text not null,
          category text not null,
          priority text default 'normal' not null,
          status text default 'open' not null,
          order_id uuid references orders on delete set null,
          last_activity_at timestamptz default now() not null,
          created_at timestamptz default now() not null
        );

        create table if not exists case_messages (
          id uuid default gen_random_uuid() primary key,
          case_id uuid references cases on delete cascade not null,
          user_id uuid references auth.users on delete cascade not null,
          body text not null,
          is_staff boolean default false not null,
          created_at timestamptz default now() not null
        );

        -- Widen numeric columns if they were created with smaller precision
        alter table if exists services
          alter column rate type numeric(14,6) using rate::numeric(14,6),
          alter column provider_rate type numeric(14,8) using provider_rate::numeric(14,8);

        create or replace function handle_new_user()
        returns trigger as $$
        begin
          insert into public.profiles (id, full_name)
          values (new.id, new.raw_user_meta_data->>'name')
          on conflict (id) do nothing;
          return new;
        end;
        $$ language plpgsql security definer;

        drop trigger if exists on_auth_user_created on auth.users;
        create trigger on_auth_user_created
          after insert on auth.users
          for each row execute procedure handle_new_user();
      `);

      return { ok: true, message: "Database setup complete — all tables created. Click Sync now to load services." };
    } finally {
      await sql.end({ timeout: 5 });
    }
  });
