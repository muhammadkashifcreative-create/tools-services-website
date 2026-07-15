-- Text-only reviews from verified buyers + new-book announcement emails.

create table if not exists book_reviews (
  id uuid default gen_random_uuid() primary key,
  book_id uuid references books on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  rating integer not null check (rating between 1 and 5),
  body text not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique (book_id, user_id)
);
alter table book_reviews enable row level security;

-- Set once when the launch announcement email has been sent for a book
alter table books add column if not exists announced_at timestamptz;

-- Users who clicked unsubscribe in a promotional email
alter table profiles add column if not exists marketing_opt_out boolean default false not null;
