-- Public newsletter signup (footer "Stay updated" form) — separate from
-- registered-user accounts, so visitors can subscribe without an account.
create table if not exists newsletter_subscribers (
  id uuid default gen_random_uuid() primary key,
  email text unique not null,
  subscribed_at timestamptz default now() not null,
  unsubscribed_at timestamptz
);
alter table newsletter_subscribers enable row level security;
