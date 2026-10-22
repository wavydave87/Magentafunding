-- Minimal Supabase environment for scripts/db/check-migrations.ts.
-- Only objects the migrations reference but do not create themselves.

create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

-- Auth
create schema auth;
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create function auth.uid() returns uuid
  language sql stable
  as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

-- Storage
create schema storage;
create table storage.buckets (
  id text primary key,
  name text not null,
  public boolean default false
);
create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets(id),
  name text,
  owner uuid,
  created_at timestamptz default now()
);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[]
  language sql immutable
  as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;

-- Extensions live in their own schema on Supabase.
create schema extensions;
create extension pgcrypto schema extensions;

grant usage on schema auth, storage, extensions to anon, authenticated, service_role;

-- Realtime publication that migrations add tables to.
create publication supabase_realtime;
