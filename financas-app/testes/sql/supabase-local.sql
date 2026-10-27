-- Imita o que o Supabase já tem pronto (usuários, auth.uid(), papéis anon/authenticated) para testar o esquema.sql num Postgres comum.
do $$ begin if not exists (select from pg_roles where rolname = 'anon') then create role anon nologin; end if; if not exists (select from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if; end $$;
grant usage on schema public to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on functions to anon, authenticated;
create schema auth; grant usage on schema auth to anon, authenticated;
create table auth.users (id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
insert into auth.users values ('aaaaaaaa-0000-0000-0000-000000000001','joao@x'),('bbbbbbbb-0000-0000-0000-000000000002','outro@x');
