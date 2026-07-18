-- Book detail metadata: language shown on the storefront book page.
-- Additive + defaulted so existing rows and the public catalog keep working.
alter table books add column if not exists language text default 'English';
