-- Darzan Finanças · atualização de segurança (outubro/2026).
-- Rode UMA vez no Supabase: SQL Editor → New query → cole tudo → Run. Pode rodar de novo sem problema.
-- (Tudo isto já está no esquema.sql; este arquivo é só o pedaço novo, para ficar mais fácil de colar.)

-- ids sem caracteres que viram código na tela
alter table public.extrato drop constraint if exists extrato_id_seguro;
alter table public.extrato add constraint extrato_id_seguro check (char_length(id) between 1 and 120 and id !~ '[<>"''\`&\\]');
alter table public.contas drop constraint if exists contas_id_seguro;
alter table public.contas add constraint contas_id_seguro check (char_length(id) between 1 and 120 and id !~ '[<>"''\`&\\]');
alter table public.cartoes drop constraint if exists cartoes_id_seguro;
alter table public.cartoes add constraint cartoes_id_seguro check (char_length(id) between 1 and 120 and id !~ '[<>"''\`&\\]');
alter table public.parcelados drop constraint if exists parcelados_id_seguro;
alter table public.parcelados add constraint parcelados_id_seguro check (char_length(id) between 1 and 120 and id !~ '[<>"''\`&\\]');
alter table public.fixas drop constraint if exists fixas_id_seguro;
alter table public.fixas add constraint fixas_id_seguro check (char_length(id) between 1 and 120 and id !~ '[<>"''\`&\\]');
alter table public.equipamentos drop constraint if exists equipamentos_id_seguro;
alter table public.equipamentos add constraint equipamentos_id_seguro check (char_length(id) between 1 and 120 and id !~ '[<>"''\`&\\]');
alter table public.trabalhos drop constraint if exists trabalhos_id_seguro;
alter table public.trabalhos add constraint trabalhos_id_seguro check (char_length(id) between 1 and 120 and id !~ '[<>"''\`&\\]');
alter table public.anexos drop constraint if exists anexos_id_seguro;
alter table public.anexos add constraint anexos_id_seguro check (char_length(id) between 1 and 120 and id !~ '[<>"''\`&\\]');
alter table public.tarefas drop constraint if exists tarefas_id_seguro;
alter table public.tarefas add constraint tarefas_id_seguro check (char_length(id) between 1 and 120 and id !~ '[<>"''\`&\\]');
alter table public.metas drop constraint if exists metas_id_seguro;
alter table public.metas add constraint metas_id_seguro check (char_length(id) between 1 and 120 and id !~ '[<>"''\`&\\]');
alter table public.categorias drop constraint if exists categorias_id_seguro;
alter table public.categorias add constraint categorias_id_seguro check (char_length(id) between 1 and 120 and id !~ '[<>"''\`&\\]');
alter table public.avisos drop constraint if exists avisos_id_seguro;
alter table public.avisos add constraint avisos_id_seguro check (char_length(id) between 1 and 120 and id !~ '[<>"''\`&\\]');
alter table public.aparelhos drop constraint if exists aparelhos_id_seguro;
alter table public.aparelhos add constraint aparelhos_id_seguro check (char_length(id) between 1 and 120 and id !~ '[<>"''\`&\\]');

-- arquivos: só "data:tipo;base64,..." (nada de link ou script escondido) e no máximo uns 9 MB de arquivo
alter table public.anexos drop constraint if exists anexos_conteudo_seguro;
alter table public.anexos add constraint anexos_conteudo_seguro check (conteudo is null or (char_length(conteudo) <= 12000000 and conteudo ~ '^data:[a-z]+/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=]+$'));
alter table public.equipamentos drop constraint if exists equipamentos_foto_segura;
alter table public.equipamentos add constraint equipamentos_foto_segura check (foto is null or foto = '' or (char_length(foto) <= 2000000 and foto ~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$'));

-- excluir um trabalho apaga junto os comprovantes e contratos dele (LGPD: não sobra documento de cliente esquecido)
create or replace function public.apagar_anexos_do_trabalho() returns trigger language plpgsql set search_path = '' as $$
begin delete from public.anexos where trabalho = old.id and user_id = old.user_id; return old; end $$;
drop trigger if exists apagar_anexos on public.trabalhos;
create trigger apagar_anexos after delete on public.trabalhos for each row execute function public.apagar_anexos_do_trabalho();

-- acesso do Claude: no máximo 1000 mudanças por vez e não grava avisos
create or replace function public.claude_tabela_ok(p_tabela text) returns boolean language sql immutable set search_path = '' as $$
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

-- gravar ou apagar linhas do dono da chave: [{"tabela": "extrato", "op": "salvar"|"apagar", "linha": {"id": ..., colunas...}}]
-- "salvar" só mexe nas colunas que vierem; linha nova é criada para o dono; linha de outra pessoa nunca é tocada
create or replace function public.claude_gravar(p_chave text, p_ops jsonb) returns json language plpgsql security definer set search_path = '' as $$
declare u uuid := public.claude_dono(p_chave); o jsonb; t text; l jsonb; cols text[]; c text; n int; feitos int := 0;
begin
  if jsonb_typeof(p_ops) <> 'array' or jsonb_array_length(p_ops) > 1000 then raise exception 'mande no máximo 1000 mudanças por vez'; end if;
  for o in select * from jsonb_array_elements(p_ops) loop
    t := o->>'tabela'; l := o->'linha';
    if not public.claude_tabela_ok(t) then raise exception 'tabela não permitida: %', t; end if;
    if t = 'avisos' then raise exception 'a chave não grava avisos (só o app agenda os avisos)'; end if;
    if coalesce(l->>'id', '') = '' then raise exception 'linha sem id na tabela %', t; end if;
    if o->>'op' = 'apagar' then
      execute format('delete from public.%I where id = $1 and user_id = $2', t) using l->>'id', u;
    elsif o->>'op' = 'salvar' then
      select array_agg(k) into cols from jsonb_object_keys(l) k where k not in ('user_id', 'criado_em', 'atualizado_em');
      foreach c in array cols loop
        if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = t and column_name = c) then raise exception 'coluna % não existe em %', c, t; end if;
      end loop;
      execute format('insert into public.%I (user_id, %s) select $1, %s from jsonb_populate_record(null::public.%I, $2) on conflict (id) do %s',
        t, (select string_agg(format('%I', x), ', ') from unnest(cols) x), (select string_agg(format('%I', x), ', ') from unnest(cols) x), t,
        coalesce('update set ' || (select string_agg(format('%I = excluded.%I', x, x), ', ') from unnest(cols) x where x <> 'id') || format(' where public.%I.user_id = $1', t), 'nothing'))
        using u, l;
    else raise exception 'op desconhecida: %', o->>'op';
    end if;
    get diagnostics n = row_count; feitos := feitos + n;
  end loop;
  return json_build_object('ok', true, 'linhas', feitos);
end $$;

select 'Pronto! Segurança atualizada.' as resultado;
