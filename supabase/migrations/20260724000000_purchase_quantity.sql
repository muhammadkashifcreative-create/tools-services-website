-- How many copies a customer ordered. Existing purchases were all single
-- copies, so 1 is the right backfill and default.
alter table book_purchases add column if not exists quantity integer default 1 not null check (quantity > 0);
