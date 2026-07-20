-- Run this in Supabase SQL editor
-- Add active system for auto pause/resume

alter table whitelist add column if not exists active boolean default true;
alter table whitelist add column if not exists last_status_at timestamp default now();

-- Update all existing rows to active = true
update whitelist set active = true where active is null;

-- Create index for faster status monitor
create index if not exists idx_whitelist_active on whitelist(active);
create index if not exists idx_whitelist_discord on whitelist(discord_id);

-- exec_stats table (if not exists)
create table if not exists exec_stats (id int primary key, count int default 0, updated_at timestamp default now());
insert into exec_stats (id,count) values (1,0) on conflict (id) do nothing;
