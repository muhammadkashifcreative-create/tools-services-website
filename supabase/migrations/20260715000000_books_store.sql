-- Bookstore pivot: guide books catalog + Stripe purchases.
-- Books are digital PDFs stored in the private `book-files` bucket;
-- covers live in the public `book-covers` bucket.

create table if not exists books (
  id uuid default gen_random_uuid() primary key,
  slug text unique not null,
  title text not null,
  author text,
  description text,
  category text default 'General' not null,
  level text default 'All levels' not null,
  pages integer,
  price_usd numeric(10,2) not null check (price_usd > 0),
  cover_url text,
  file_path text,
  published boolean default false not null,
  sort integer default 0 not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table if not exists book_purchases (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  book_id uuid references books on delete restrict not null,
  amount_usd numeric(10,2) not null,
  currency text default 'usd' not null,
  stripe_session_id text unique,
  stripe_payment_intent text,
  status text default 'pending' not null, -- pending | paid | failed
  created_at timestamptz default now() not null,
  paid_at timestamptz
);

create index if not exists book_purchases_user_idx on book_purchases (user_id, created_at desc);

-- All reads/writes go through server functions using the service role,
-- so RLS stays enabled with no policies (deny-all for anon/authenticated).
alter table books enable row level security;
alter table book_purchases enable row level security;

-- Storage buckets: covers are public, book files are private (signed URLs only).
insert into storage.buckets (id, name, public)
values ('book-covers', 'book-covers', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('book-files', 'book-files', false)
on conflict (id) do nothing;
