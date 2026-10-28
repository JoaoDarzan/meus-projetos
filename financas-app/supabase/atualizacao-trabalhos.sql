-- Darzan Finanças · atualização de outubro/2026: trabalhos com vídeos, parcelas e anexos (comprovantes e contratos).
-- Rode UMA vez no Supabase: SQL Editor → New query → cole tudo → Run. Pode rodar de novo sem problema.
-- (Tudo isto já está no esquema.sql; este arquivo é só o pedaço novo, para ficar mais fácil de colar.)

-- TRABALHOS: briefing, vídeos a entregar e parcela mensal
alter table public.trabalhos add column if not exists briefing text;
alter table public.trabalhos add column if not exists entregas text;
alter table public.trabalhos add column if not exists parcela_mensal numeric;
alter table public.trabalhos add column if not exists dia_da_parcela numeric;

-- ANEXOS
create table if not exists public.anexos (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  trabalho text,
  lancamento text,
  nome text,
  tipo text,
  data date,
  valor numeric,
  arquivo text,
  tamanho numeric,
  conteudo text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
alter table public.anexos add column if not exists trabalho text;
alter table public.anexos add column if not exists lancamento text;
alter table public.anexos add column if not exists nome text;
alter table public.anexos add column if not exists tipo text;
alter table public.anexos add column if not exists data date;
alter table public.anexos add column if not exists valor numeric;
alter table public.anexos add column if not exists arquivo text;
alter table public.anexos add column if not exists tamanho numeric;
alter table public.anexos add column if not exists conteudo text;
create index if not exists anexos_user_id on public.anexos (user_id);
alter table public.anexos enable row level security;
drop policy if exists "so o dono" on public.anexos;
create policy "so o dono" on public.anexos for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke all on public.anexos from anon;
grant select, insert, update, delete on public.anexos to authenticated;
drop trigger if exists marcar_atualizado on public.anexos;
create trigger marcar_atualizado before update on public.anexos for each row execute function public.marcar_atualizado();

-- Acesso do Claude: pode ler e gravar anexos; ao ler, o arquivo (pesado) fica de fora
create or replace function public.claude_tabela_ok(p_tabela text) returns boolean language sql immutable as $$
  select p_tabela = any (array['extrato', 'contas', 'cartoes', 'parcelados', 'fixas', 'equipamentos', 'trabalhos', 'anexos', 'tarefas', 'metas', 'categorias', 'avisos']);
$$;

-- ler uma tabela inteira do dono da chave (sem o arquivo dos anexos, que é pesado)
create or replace function public.claude_ler(p_chave text, p_tabela text) returns json language plpgsql security definer set search_path = '' as $$
declare u uuid := public.claude_dono(p_chave); r json;
begin
  if not public.claude_tabela_ok(p_tabela) then raise exception 'tabela não permitida: %', p_tabela; end if;
  execute format('select coalesce(json_agg(to_jsonb(t) - ''conteudo'' order by t.id), ''[]''::json) from (select * from public.%I where user_id = $1) t', p_tabela) into r using u;
  return r;
end $$;

select 'Pronto! Trabalhos atualizados.' as resultado;
