-- Darzan Finanças: as tabelas do app. Gerado por financas-app/ferramentas/gerar_sql.js (não edite à mão).
-- Rode no Supabase: SQL Editor → New query → cole tudo → Run. Pode rodar de novo sem perder nada.

-- cada linha é de um dono; só ele vê e mexe (Row Level Security)
create or replace function public.marcar_atualizado() returns trigger language plpgsql set search_path = '' as $$
begin new.atualizado_em = now(); return new; end $$;

-- EXTRATO
create table if not exists public.extrato (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  data date,
  banco text,
  descricao text,
  grupo text,
  tipo text,
  valor numeric,
  categoria text,
  subcategoria text,
  status text,
  parcela text,
  obs text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
alter table public.extrato add column if not exists data date;
alter table public.extrato add column if not exists banco text;
alter table public.extrato add column if not exists descricao text;
alter table public.extrato add column if not exists grupo text;
alter table public.extrato add column if not exists tipo text;
alter table public.extrato add column if not exists valor numeric;
alter table public.extrato add column if not exists categoria text;
alter table public.extrato add column if not exists subcategoria text;
alter table public.extrato add column if not exists status text;
alter table public.extrato add column if not exists parcela text;
alter table public.extrato add column if not exists obs text;
create index if not exists extrato_user_id on public.extrato (user_id);
alter table public.extrato enable row level security;
drop policy if exists "so o dono" on public.extrato;
create policy "so o dono" on public.extrato for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke all on public.extrato from anon;
grant select, insert, update, delete on public.extrato to authenticated;
drop trigger if exists marcar_atualizado on public.extrato;
create trigger marcar_atualizado before update on public.extrato for each row execute function public.marcar_atualizado();

-- CONTAS
create table if not exists public.contas (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  banco text,
  conta text,
  saldo_conferido numeric,
  data_da_conferencia date,
  para_que text,
  obs text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
alter table public.contas add column if not exists banco text;
alter table public.contas add column if not exists conta text;
alter table public.contas add column if not exists saldo_conferido numeric;
alter table public.contas add column if not exists data_da_conferencia date;
alter table public.contas add column if not exists para_que text;
alter table public.contas add column if not exists obs text;
create index if not exists contas_user_id on public.contas (user_id);
alter table public.contas enable row level security;
drop policy if exists "so o dono" on public.contas;
create policy "so o dono" on public.contas for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke all on public.contas from anon;
grant select, insert, update, delete on public.contas to authenticated;
drop trigger if exists marcar_atualizado on public.contas;
create trigger marcar_atualizado before update on public.contas for each row execute function public.marcar_atualizado();

-- CARTOES
create table if not exists public.cartoes (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  cartao text,
  limite numeric,
  fecha_dia numeric,
  vence_dia numeric,
  paga_pela_conta text,
  obs text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
alter table public.cartoes add column if not exists cartao text;
alter table public.cartoes add column if not exists limite numeric;
alter table public.cartoes add column if not exists fecha_dia numeric;
alter table public.cartoes add column if not exists vence_dia numeric;
alter table public.cartoes add column if not exists paga_pela_conta text;
alter table public.cartoes add column if not exists obs text;
create index if not exists cartoes_user_id on public.cartoes (user_id);
alter table public.cartoes enable row level security;
drop policy if exists "so o dono" on public.cartoes;
create policy "so o dono" on public.cartoes for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke all on public.cartoes from anon;
grant select, insert, update, delete on public.cartoes to authenticated;
drop trigger if exists marcar_atualizado on public.cartoes;
create trigger marcar_atualizado before update on public.cartoes for each row execute function public.marcar_atualizado();

-- PARCELADOS
create table if not exists public.parcelados (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  data_da_compra date,
  descricao text,
  cartao text,
  valor_total numeric,
  parcelas numeric,
  valor_da_parcela numeric,
  primeira_parcela text,
  categoria text,
  subcategoria text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
alter table public.parcelados add column if not exists data_da_compra date;
alter table public.parcelados add column if not exists descricao text;
alter table public.parcelados add column if not exists cartao text;
alter table public.parcelados add column if not exists valor_total numeric;
alter table public.parcelados add column if not exists parcelas numeric;
alter table public.parcelados add column if not exists valor_da_parcela numeric;
alter table public.parcelados add column if not exists primeira_parcela text;
alter table public.parcelados add column if not exists categoria text;
alter table public.parcelados add column if not exists subcategoria text;
create index if not exists parcelados_user_id on public.parcelados (user_id);
alter table public.parcelados enable row level security;
drop policy if exists "so o dono" on public.parcelados;
create policy "so o dono" on public.parcelados for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke all on public.parcelados from anon;
grant select, insert, update, delete on public.parcelados to authenticated;
drop trigger if exists marcar_atualizado on public.parcelados;
create trigger marcar_atualizado before update on public.parcelados for each row execute function public.marcar_atualizado();

-- FIXAS
create table if not exists public.fixas (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  descricao text,
  valor numeric,
  dia numeric,
  banco text,
  tipo text,
  grupo text,
  categoria text,
  subcategoria text,
  ativa text,
  obs text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
alter table public.fixas add column if not exists descricao text;
alter table public.fixas add column if not exists valor numeric;
alter table public.fixas add column if not exists dia numeric;
alter table public.fixas add column if not exists banco text;
alter table public.fixas add column if not exists tipo text;
alter table public.fixas add column if not exists grupo text;
alter table public.fixas add column if not exists categoria text;
alter table public.fixas add column if not exists subcategoria text;
alter table public.fixas add column if not exists ativa text;
alter table public.fixas add column if not exists obs text;
create index if not exists fixas_user_id on public.fixas (user_id);
alter table public.fixas enable row level security;
drop policy if exists "so o dono" on public.fixas;
create policy "so o dono" on public.fixas for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke all on public.fixas from anon;
grant select, insert, update, delete on public.fixas to authenticated;
drop trigger if exists marcar_atualizado on public.fixas;
create trigger marcar_atualizado before update on public.fixas for each row execute function public.marcar_atualizado();

-- EQUIPAMENTOS
create table if not exists public.equipamentos (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome text,
  tipo text,
  valor numeric,
  data_da_compra date,
  como_pagou text,
  estado text,
  numero_de_serie text,
  obs text,
  foto text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
alter table public.equipamentos add column if not exists nome text;
alter table public.equipamentos add column if not exists tipo text;
alter table public.equipamentos add column if not exists valor numeric;
alter table public.equipamentos add column if not exists data_da_compra date;
alter table public.equipamentos add column if not exists como_pagou text;
alter table public.equipamentos add column if not exists estado text;
alter table public.equipamentos add column if not exists numero_de_serie text;
alter table public.equipamentos add column if not exists obs text;
alter table public.equipamentos add column if not exists foto text;
create index if not exists equipamentos_user_id on public.equipamentos (user_id);
alter table public.equipamentos enable row level security;
drop policy if exists "so o dono" on public.equipamentos;
create policy "so o dono" on public.equipamentos for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke all on public.equipamentos from anon;
grant select, insert, update, delete on public.equipamentos to authenticated;
drop trigger if exists marcar_atualizado on public.equipamentos;
create trigger marcar_atualizado before update on public.equipamentos for each row execute function public.marcar_atualizado();

-- TRABALHOS
create table if not exists public.trabalhos (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  cliente text,
  tipo_de_evento text,
  data_do_evento date,
  local text,
  o_que_foi_fechado text,
  valor_total numeric,
  entrega date,
  etapa text,
  telefone text,
  contrato text,
  obs text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
alter table public.trabalhos add column if not exists cliente text;
alter table public.trabalhos add column if not exists tipo_de_evento text;
alter table public.trabalhos add column if not exists data_do_evento date;
alter table public.trabalhos add column if not exists local text;
alter table public.trabalhos add column if not exists o_que_foi_fechado text;
alter table public.trabalhos add column if not exists valor_total numeric;
alter table public.trabalhos add column if not exists entrega date;
alter table public.trabalhos add column if not exists etapa text;
alter table public.trabalhos add column if not exists telefone text;
alter table public.trabalhos add column if not exists contrato text;
alter table public.trabalhos add column if not exists obs text;
create index if not exists trabalhos_user_id on public.trabalhos (user_id);
alter table public.trabalhos enable row level security;
drop policy if exists "so o dono" on public.trabalhos;
create policy "so o dono" on public.trabalhos for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke all on public.trabalhos from anon;
grant select, insert, update, delete on public.trabalhos to authenticated;
drop trigger if exists marcar_atualizado on public.trabalhos;
create trigger marcar_atualizado before update on public.trabalhos for each row execute function public.marcar_atualizado();

-- TAREFAS
create table if not exists public.tarefas (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  tarefa text,
  data date,
  valor numeric,
  tipo text,
  feita boolean not null default false,
  obs text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
alter table public.tarefas add column if not exists tarefa text;
alter table public.tarefas add column if not exists data date;
alter table public.tarefas add column if not exists valor numeric;
alter table public.tarefas add column if not exists tipo text;
alter table public.tarefas add column if not exists feita boolean not null default false;
alter table public.tarefas add column if not exists obs text;
create index if not exists tarefas_user_id on public.tarefas (user_id);
alter table public.tarefas enable row level security;
drop policy if exists "so o dono" on public.tarefas;
create policy "so o dono" on public.tarefas for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke all on public.tarefas from anon;
grant select, insert, update, delete on public.tarefas to authenticated;
drop trigger if exists marcar_atualizado on public.tarefas;
create trigger marcar_atualizado before update on public.tarefas for each row execute function public.marcar_atualizado();

-- METAS
create table if not exists public.metas (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  meta text,
  valor_alvo numeric,
  ja_guardado numeric,
  onde_esta text,
  prazo date,
  obs text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
alter table public.metas add column if not exists meta text;
alter table public.metas add column if not exists valor_alvo numeric;
alter table public.metas add column if not exists ja_guardado numeric;
alter table public.metas add column if not exists onde_esta text;
alter table public.metas add column if not exists prazo date;
alter table public.metas add column if not exists obs text;
create index if not exists metas_user_id on public.metas (user_id);
alter table public.metas enable row level security;
drop policy if exists "so o dono" on public.metas;
create policy "so o dono" on public.metas for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke all on public.metas from anon;
grant select, insert, update, delete on public.metas to authenticated;
drop trigger if exists marcar_atualizado on public.metas;
create trigger marcar_atualizado before update on public.metas for each row execute function public.marcar_atualizado();

-- CATEGORIAS
create table if not exists public.categorias (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  categoria text,
  subcategoria text,
  grupo text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
alter table public.categorias add column if not exists categoria text;
alter table public.categorias add column if not exists subcategoria text;
alter table public.categorias add column if not exists grupo text;
create index if not exists categorias_user_id on public.categorias (user_id);
alter table public.categorias enable row level security;
drop policy if exists "so o dono" on public.categorias;
create policy "so o dono" on public.categorias for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke all on public.categorias from anon;
grant select, insert, update, delete on public.categorias to authenticated;
drop trigger if exists marcar_atualizado on public.categorias;
create trigger marcar_atualizado before update on public.categorias for each row execute function public.marcar_atualizado();

-- sinal de vida: o lembrete automático chama isto a cada poucos dias para o projeto não "dormir"
create table if not exists public.sinal_de_vida (id int primary key default 1, em timestamptz not null default now());
alter table public.sinal_de_vida enable row level security;
revoke all on public.sinal_de_vida from anon, authenticated;
create or replace function public.manter_ativo() returns timestamptz language sql security definer set search_path = '' as $$
  insert into public.sinal_de_vida (id, em) values (1, now()) on conflict (id) do update set em = now() returning em;
$$;
revoke all on function public.manter_ativo() from public;
grant execute on function public.manter_ativo() to anon, authenticated;

select 'Pronto! Tabelas criadas.' as resultado;
