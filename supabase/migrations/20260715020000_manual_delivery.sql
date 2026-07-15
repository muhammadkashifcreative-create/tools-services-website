-- Manual delivery: purchases are fulfilled by the admin from the dashboard.
-- If the book already has a PDF uploaded, delivery happens instantly on
-- payment; otherwise the purchase sits in 'pending' until the admin delivers
-- (optionally with a per-customer file).

alter table book_purchases add column if not exists delivery_status text default 'pending' not null; -- pending | delivered
alter table book_purchases add column if not exists delivered_file_path text;
alter table book_purchases add column if not exists delivered_at timestamptz;
