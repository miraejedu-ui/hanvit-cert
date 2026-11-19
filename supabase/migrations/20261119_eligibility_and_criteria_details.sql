-- Eligibility presets + structured criteria details (additive / non-breaking)

create table if not exists eligibility_presets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  content text not null default '',
  created_at timestamptz not null default now()
);

alter table criteria
  add column if not exists details jsonb default '{}'::jsonb;

alter table eligibility_presets enable row level security;
