import { createServerFn } from "@tanstack/react-start";
import { requireDirectAuth as requireSupabaseAuth, isAdminUser } from "@/lib/direct-auth-middleware.server";

const ALL_TABLES = [
  "app_settings",
  "profiles",
  "user_roles",
  "cases",
  "case_messages",
  "books",
  "book_purchases",
  "book_reviews",
  "newsletter_subscribers",
];

export const runDatabaseMigration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!(await isAdminUser(context))) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Check which tables exist by querying each one
    const missing: string[] = [];
    for (const table of ALL_TABLES) {
      const { error } = await supabaseAdmin.from(table as "services").select("*").limit(1);
      if (error?.message?.includes("does not exist") || error?.message?.includes("schema cache")) {
        missing.push(table);
      }
    }

    // Column-level checks: tables may exist from before newer features
    const columnChecks: Array<[string, string]> = [
      ["book_purchases", "delivery_status"],
      ["book_purchases", "refund_status"],
      ["book_purchases", "review_requested_at"],
      ["books", "announced_at"],
      ["books", "language"],
      ["profiles", "marketing_opt_out"],
    ];
    for (const [table, column] of columnChecks) {
      if (missing.includes(table)) continue;
      const { error } = await supabaseAdmin
        .from(table as "services")
        .select(column as "*")
        .limit(1);
      if (error?.message?.includes("does not exist") || error?.message?.includes("schema cache")) {
        missing.push(`${table}.${column} (new column)`);
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
create table if not exists cases (id uuid default gen_random_uuid() primary key, user_id uuid references auth.users on delete cascade not null, subject text not null, category text not null, priority text default 'normal' not null, status text default 'open' not null, order_id uuid, last_activity_at timestamptz default now() not null, created_at timestamptz default now() not null);
create table if not exists case_messages (id uuid default gen_random_uuid() primary key, case_id uuid references cases on delete cascade not null, author_id uuid references auth.users on delete cascade not null, body text not null, is_staff boolean default false not null, attachments jsonb default '[]'::jsonb not null, created_at timestamptz default now() not null);
create table if not exists books (id uuid default gen_random_uuid() primary key, slug text unique not null, title text not null, author text, description text, category text default 'General' not null, level text default 'All levels' not null, pages integer, price_usd numeric(10,2) not null check (price_usd > 0), cover_url text, file_path text, published boolean default false not null, sort integer default 0 not null, created_at timestamptz default now() not null, updated_at timestamptz default now() not null);
create table if not exists book_purchases (id uuid default gen_random_uuid() primary key, user_id uuid references auth.users on delete cascade not null, book_id uuid references books on delete restrict not null, amount_usd numeric(10,2) not null, currency text default 'usd' not null, stripe_session_id text unique, stripe_payment_intent text, status text default 'pending' not null, created_at timestamptz default now() not null, paid_at timestamptz);
alter table book_purchases add column if not exists delivery_status text default 'pending' not null;
alter table book_purchases add column if not exists delivered_file_path text;
alter table book_purchases add column if not exists delivered_at timestamptz;
alter table book_purchases add column if not exists refund_status text default 'none' not null;
alter table book_purchases add column if not exists refund_reason text;
alter table book_purchases add column if not exists refund_requested_at timestamptz;
alter table book_purchases add column if not exists refund_processed_at timestamptz;
alter table book_purchases add column if not exists stripe_refund_id text;
alter table book_purchases add column if not exists review_requested_at timestamptz;
create index if not exists book_purchases_user_idx on book_purchases (user_id, created_at desc);
create table if not exists book_reviews (id uuid default gen_random_uuid() primary key, book_id uuid references books on delete cascade not null, user_id uuid references auth.users on delete cascade not null, rating integer not null check (rating between 1 and 5), body text not null, created_at timestamptz default now() not null, updated_at timestamptz default now() not null, unique (book_id, user_id));
create table if not exists newsletter_subscribers (id uuid default gen_random_uuid() primary key, email text unique not null, subscribed_at timestamptz default now() not null, unsubscribed_at timestamptz);
alter table newsletter_subscribers enable row level security;
alter table books add column if not exists announced_at timestamptz;
alter table books add column if not exists language text default 'English';
alter table profiles add column if not exists marketing_opt_out boolean default false not null;
alter table books enable row level security;
alter table book_purchases enable row level security;
alter table book_reviews enable row level security;
insert into storage.buckets (id, name, public) values ('book-covers', 'book-covers', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('book-files', 'book-files', false) on conflict (id) do nothing;
create or replace function handle_new_user() returns trigger as $$ begin insert into public.profiles (id, full_name) values (new.id, new.raw_user_meta_data->>'name') on conflict (id) do nothing; return new; end; $$ language plpgsql security definer;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure handle_new_user();`,
    };
  });
