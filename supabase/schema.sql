-- 한빛자격정보원 Supabase 스키마
-- Supabase Dashboard → SQL Editor 에서 전체 실행

create extension if not exists "pgcrypto";

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password text not null,
  name text not null,
  phone text,
  birth_date text,
  role text not null check (role in ('applicant', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists majors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  related_jobs jsonb not null default '[]'::jsonb
);

create table if not exists job_fields (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  similar_jobs jsonb not null default '[]'::jsonb
);

create table if not exists certifications (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  organization text not null default '',
  related_majors jsonb not null default '[]'::jsonb,
  job_fields jsonb not null default '[]'::jsonb,
  subjects jsonb not null default '[]'::jsonb,
  pass_criteria text not null default '',
  overview text not null default '',
  duties text not null default '',
  career text not null default '',
  eligibility text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists notices (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null default '',
  file_name text,
  file_path text,
  author_id uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists criteria (
  id uuid primary key default gen_random_uuid(),
  certification_id uuid references certifications(id) on delete cascade,
  title text not null,
  content text not null default '',
  file_name text,
  file_path text,
  details jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists eligibility_presets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  content text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  certification_id uuid references certifications(id) on delete cascade,
  name text not null,
  birth_date text not null,
  phone text not null,
  email text not null,
  document_file_name text,
  document_path text,
  status text not null default 'pending',
  status_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists exams (
  id uuid primary key default gen_random_uuid(),
  certification_id uuid references certifications(id) on delete cascade,
  title text not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  duration_minutes int not null default 60,
  anti_cheat boolean not null default false,
  questions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists attempts (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid references exams(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  application_id uuid references applications(id) on delete set null,
  status text not null default 'in_progress',
  answers jsonb not null default '[]'::jsonb,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  total_score numeric,
  passed boolean,
  switch_count int not null default 0
);

create table if not exists chat_rooms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references chat_rooms(id) on delete cascade,
  sender_id uuid references users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists issued_certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  certification_id uuid references certifications(id) on delete cascade,
  name text not null,
  birth_date text not null,
  phone text not null,
  issue_date text not null,
  cert_type text not null default 'pass',
  file_name text,
  file_path text,
  created_at timestamptz not null default now()
);

create table if not exists authenticity (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  birth_date text not null,
  phone text not null,
  issue_date text not null,
  certification_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists certificate_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  certification_id uuid references certifications(id) on delete cascade,
  exam_attempt_id uuid references attempts(id) on delete cascade,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

-- Storage: Dashboard → Storage → New bucket
-- Bucket name: uploads
-- Public bucket: OFF (signed URL로 다운로드)

-- RLS: 서버는 service_role 키로 접근하므로 앱 API에서는 RLS 우회.
-- 안전을 위해 기본은 RLS 활성화 + 정책 없음(anon 차단)
alter table users enable row level security;
alter table majors enable row level security;
alter table job_fields enable row level security;
alter table certifications enable row level security;
alter table notices enable row level security;
alter table criteria enable row level security;
alter table eligibility_presets enable row level security;
alter table applications enable row level security;
alter table exams enable row level security;
alter table attempts enable row level security;
alter table chat_rooms enable row level security;
alter table chat_messages enable row level security;
alter table issued_certificates enable row level security;
alter table authenticity enable row level security;
alter table certificate_requests enable row level security;
