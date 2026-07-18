-- Customer-requested refunds that require ADMIN APPROVAL before money is
-- returned. Additive columns on book_purchases; reads fall back to the base
-- columns so the store keeps working before this migration runs.
alter table book_purchases add column if not exists refund_status text default 'none' not null; -- none | requested | rejected | refunded
alter table book_purchases add column if not exists refund_reason text;
alter table book_purchases add column if not exists refund_requested_at timestamptz;
alter table book_purchases add column if not exists refund_processed_at timestamptz;
alter table book_purchases add column if not exists stripe_refund_id text;
