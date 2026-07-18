-- Tracks when the admin last asked a customer to review their purchase,
-- shown in Admin -> Sales so requests aren't sent blind.
alter table book_purchases add column if not exists review_requested_at timestamptz;
