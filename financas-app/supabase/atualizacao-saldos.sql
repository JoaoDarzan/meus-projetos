-- Atualização de novembro/2026 (caixinhas conferidas todo dia + quanto rendeu). Rodar uma vez:
-- Supabase → SQL Editor → New query → colar tudo → Run. Pode rodar mais de uma vez sem problema.

-- 1) Saldos: a "foto" de todo dia do saldo de cada conta e caixinha. O robô do Open Finance grava uma por conta por dia,
--    e o app mostra quanto rendeu ontem, no mês e a comparação com o mês passado. Só o dono vê e mexe, igual às outras tabelas.
create table if not exists public.saldos (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  data date,
  banco text,
  conta text,
  saldo numeric,
  obs text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
alter table public.saldos add column if not exists data date;
alter table public.saldos add column if not exists banco text;
alter table public.saldos add column if not exists conta text;
alter table public.saldos add column if not exists saldo numeric;
alter table public.saldos add column if not exists obs text;
create index if not exists saldos_user_id on public.saldos (user_id);
alter table public.saldos enable row level security;
drop policy if exists "so o dono" on public.saldos;
create policy "so o dono" on public.saldos for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke all on public.saldos from anon;
grant select, insert, update, delete on public.saldos to authenticated;
-- o id nunca tem caracteres que viram código na tela (defesa extra: o app também limpa tudo que mostra)
alter table public.saldos drop constraint if exists saldos_id_seguro;
alter table public.saldos add constraint saldos_id_seguro check (char_length(id) between 1 and 120 and id !~ '[<>"''\`&\\]');
drop trigger if exists marcar_atualizado on public.saldos;
create trigger marcar_atualizado before update on public.saldos for each row execute function public.marcar_atualizado();

-- 2) O robô (Acesso do Claude) pode ler e gravar os saldos.
create or replace function public.claude_tabela_ok(p_tabela text) returns boolean language sql immutable set search_path = '' as $$
  select p_tabela = any (array['extrato', 'contas', 'cartoes', 'parcelados', 'fixas', 'equipamentos', 'trabalhos', 'anexos', 'dias', 'holerites', 'saldos', 'tarefas', 'metas', 'categorias', 'avisos']);
$$;
revoke all on function public.claude_tabela_ok(text) from public, anon, authenticated; -- só as funções do Claude usam (por dentro)

select 'Pronto! Tabela de saldos criada.' as resultado;
