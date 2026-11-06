-- Atualização de novembro/2026 (holerites detalhados + segurança). Rodar uma vez:
-- Supabase → SQL Editor → New query → colar tudo → Run. Pode rodar mais de uma vez sem problema.

-- 1) Holerites: cada holerite inteiro (todos os itens, totais e bases), para abrir detalhado no app (Meu trabalho).
--    Só o dono vê e mexe, igual às outras tabelas.
create table if not exists public.holerites (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  competencia text,
  empresa text,
  pagamento date,
  banco text,
  liquido numeric,
  dados text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
alter table public.holerites add column if not exists competencia text;
alter table public.holerites add column if not exists empresa text;
alter table public.holerites add column if not exists pagamento date;
alter table public.holerites add column if not exists banco text;
alter table public.holerites add column if not exists liquido numeric;
alter table public.holerites add column if not exists dados text;
create index if not exists holerites_user_id on public.holerites (user_id);
alter table public.holerites enable row level security;
drop policy if exists "so o dono" on public.holerites;
create policy "so o dono" on public.holerites for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke all on public.holerites from anon;
grant select, insert, update, delete on public.holerites to authenticated;
-- o id nunca tem caracteres que viram código na tela (defesa extra: o app também limpa tudo que mostra)
alter table public.holerites drop constraint if exists holerites_id_seguro;
alter table public.holerites add constraint holerites_id_seguro check (char_length(id) between 1 and 120 and id !~ '[<>"''\`&\\]');
drop trigger if exists marcar_atualizado on public.holerites;
create trigger marcar_atualizado before update on public.holerites for each row execute function public.marcar_atualizado();

-- 2) Acesso do Claude pode ler e gravar os holerites; e a função que confere o nome da tabela
--    deixa de responder a qualquer pessoa na internet (só as funções do Claude usam, por dentro).
create or replace function public.claude_tabela_ok(p_tabela text) returns boolean language sql immutable set search_path = '' as $$
  select p_tabela = any (array['extrato', 'contas', 'cartoes', 'parcelados', 'fixas', 'equipamentos', 'trabalhos', 'anexos', 'dias', 'holerites', 'tarefas', 'metas', 'categorias', 'avisos']);
$$;
revoke all on function public.claude_tabela_ok(text) from public, anon, authenticated; -- só as funções do Claude usam (por dentro)

select 'pronto: holerites e segurança atualizados' as resultado;
