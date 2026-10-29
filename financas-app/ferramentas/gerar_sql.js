/* Gera financas-app/supabase/esquema.sql a partir de darzan-producoes/financas/js/tabelas.js.
   Uso: node financas-app/ferramentas/gerar_sql.js                                            */
const fs = require('fs'), path = require('path');
const raiz = path.resolve(__dirname, '../..');
require(path.join(raiz, 'darzan-producoes/financas/js/tabelas.js'));
const T = globalThis.TABELAS;
const out = [`-- Darzan Finanças: as tabelas do app. Gerado por financas-app/ferramentas/gerar_sql.js (não edite à mão).
-- Rode no Supabase: SQL Editor → New query → cole tudo → Run. Pode rodar de novo sem perder nada.

-- cada linha é de um dono; só ele vê e mexe (Row Level Security)
create or replace function public.marcar_atualizado() returns trigger language plpgsql set search_path = '' as $$
begin new.atualizado_em = now(); return new; end $$;
`];
Object.entries(T).forEach(([aba, t]) => {
  const n = 'public.' + t.tabela, cols = t.colunas.map(x => x.slice(1)).concat(t.extras || []); /* extras: colunas que o app não lê junto (o arquivo dos anexos) */
  out.push(`-- ${aba}
create table if not exists ${n} (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
${cols.map(([col, tipo]) => `  ${col} ${tipo}${tipo === 'boolean' ? ' not null default false' : ''},`).join('\n')}
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
${cols.map(([col, tipo]) => `alter table ${n} add column if not exists ${col} ${tipo}${tipo === 'boolean' ? ' not null default false' : ''};`).join('\n')}
create index if not exists ${t.tabela}_user_id on ${n} (user_id);
alter table ${n} enable row level security;
drop policy if exists "so o dono" on ${n};
create policy "so o dono" on ${n} for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke all on ${n} from anon;
grant select, insert, update, delete on ${n} to authenticated;
-- o id nunca tem caracteres que viram código na tela (defesa extra: o app também limpa tudo que mostra)
alter table ${n} drop constraint if exists ${t.tabela}_id_seguro;
alter table ${n} add constraint ${t.tabela}_id_seguro check (char_length(id) between 1 and 120 and id !~ '[<>"''\\\`&\\\\]');
drop trigger if exists marcar_atualizado on ${n};
create trigger marcar_atualizado before update on ${n} for each row execute function public.marcar_atualizado();
`);
});
out.push(`-- arquivos: só "data:tipo;base64,..." (nada de link ou script escondido) e no máximo uns 9 MB de arquivo
alter table public.anexos drop constraint if exists anexos_conteudo_seguro;
alter table public.anexos add constraint anexos_conteudo_seguro check (conteudo is null or (char_length(conteudo) <= 12000000 and conteudo ~ '^data:[a-z]+/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=]+$'));
alter table public.equipamentos drop constraint if exists equipamentos_foto_segura;
alter table public.equipamentos add constraint equipamentos_foto_segura check (foto is null or foto = '' or (char_length(foto) <= 2000000 and foto ~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$'));

-- excluir um trabalho apaga junto os comprovantes e contratos dele (LGPD: não sobra documento de cliente esquecido)
create or replace function public.apagar_anexos_do_trabalho() returns trigger language plpgsql set search_path = '' as $$
begin delete from public.anexos where trabalho = old.id and user_id = old.user_id; return old; end $$;
drop trigger if exists apagar_anexos on public.trabalhos;
create trigger apagar_anexos after delete on public.trabalhos for each row execute function public.apagar_anexos_do_trabalho();
`);
out.push(`-- sinal de vida: o lembrete automático chama isto a cada poucos dias para o projeto não "dormir"
create table if not exists public.sinal_de_vida (id int primary key default 1, em timestamptz not null default now());
alter table public.sinal_de_vida enable row level security;
revoke all on public.sinal_de_vida from anon, authenticated;
create or replace function public.manter_ativo() returns timestamptz language sql security definer set search_path = '' as $$
  insert into public.sinal_de_vida (id, em) values (1, now()) on conflict (id) do update set em = now() returning em;
$$;
revoke all on function public.manter_ativo() from public;
grant execute on function public.manter_ativo() to anon, authenticated;

-- avisos: o Netlify (que só sabe o segredo dos avisos) pega o que mandar hoje e marca como enviado.
-- O segredo fica no Netlify; aqui só a "impressão digital" dele (sha256), que é colocada à parte.
create table if not exists public.config_servidor (chave text primary key, valor text not null);
alter table public.config_servidor enable row level security;
revoke all on public.config_servidor from anon, authenticated;
create or replace function public.segredo_ok(p_segredo text) returns boolean language sql security definer set search_path = '' as $$
  select coalesce(encode(sha256(convert_to(coalesce(p_segredo, ''), 'UTF8')), 'hex') = (select valor from public.config_servidor where chave = 'avisos_hash'), false);
$$;
revoke all on function public.segredo_ok(text) from public, anon, authenticated;
create or replace function public.avisos_pendentes(p_segredo text, p_hoje date) returns json language plpgsql security definer set search_path = '' as $$
begin
  if not public.segredo_ok(p_segredo) then raise exception 'segredo dos avisos errado'; end if;
  return json_build_object(
    'avisos', (select coalesce(json_agg(a order by a.quando, a.id), '[]'::json) from (select id, user_id, quando, titulo, corpo, tipo from public.avisos where enviado is null and quando <= p_hoje and quando >= p_hoje - 2) a),
    'aparelhos', (select coalesce(json_agg(x), '[]'::json) from (select id, user_id, endpoint, p256dh, auth from public.aparelhos) x));
end $$;
create or replace function public.avisos_enviados(p_segredo text, p_ids text[]) returns int language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  if not public.segredo_ok(p_segredo) then raise exception 'segredo dos avisos errado'; end if;
  update public.avisos set enviado = to_char(now() at time zone 'America/Sao_Paulo', 'YYYY-MM-DD HH24:MI') where id = any(p_ids) and enviado is null;
  get diagnostics n = row_count; return n;
end $$;
create or replace function public.aparelho_sumiu(p_segredo text, p_id text) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.segredo_ok(p_segredo) then raise exception 'segredo dos avisos errado'; end if;
  delete from public.aparelhos where id = p_id;
end $$;
revoke all on function public.avisos_pendentes(text, date) from public;
revoke all on function public.avisos_enviados(text, text[]) from public;
revoke all on function public.aparelho_sumiu(text, text) from public;
grant execute on function public.avisos_pendentes(text, date) to anon;
grant execute on function public.avisos_enviados(text, text[]) to anon;
grant execute on function public.aparelho_sumiu(text, text) to anon;

-- Acesso do Claude: o João cria uma chave no app (Sua conta → Acesso do Claude). Aqui fica só a impressão digital
-- dela (sha256). Com a chave, o Claude lê e corrige os dados do João direto; o João troca ou desliga quando quiser.
create table if not exists public.acesso_claude (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  hash text not null,
  ultimo_uso timestamptz,
  criado_em timestamptz not null default now()
);
alter table public.acesso_claude enable row level security;
drop policy if exists "so o dono" on public.acesso_claude;
create policy "so o dono" on public.acesso_claude for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke all on public.acesso_claude from anon;
grant select, insert, update, delete on public.acesso_claude to authenticated;

create or replace function public.claude_dono(p_chave text) returns uuid language plpgsql security definer set search_path = '' as $$
declare u uuid;
begin
  select user_id into u from public.acesso_claude where hash = encode(sha256(convert_to(coalesce(p_chave, ''), 'UTF8')), 'hex');
  if u is null then raise exception 'chave do Claude errada ou desligada'; end if;
  update public.acesso_claude set ultimo_uso = now() where user_id = u;
  return u;
end $$;
revoke all on function public.claude_dono(text) from public, anon, authenticated;

create or replace function public.claude_tabela_ok(p_tabela text) returns boolean language sql immutable set search_path = '' as $$
  select p_tabela = any (array[%TABELAS%]);
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
revoke all on function public.claude_ler(text, text) from public;
revoke all on function public.claude_gravar(text, jsonb) from public;
grant execute on function public.claude_ler(text, text) to anon, authenticated;
grant execute on function public.claude_gravar(text, jsonb) to anon, authenticated;

select 'Pronto! Tabelas criadas.' as resultado;
`);
const permitidas = Object.values(T).map(t => t.tabela).filter(t => t !== 'aparelhos').map(t => `'${t}'`).join(', ');
fs.writeFileSync(path.join(raiz, 'financas-app/supabase/esquema.sql'), out.join('\n').replace('%TABELAS%', permitidas));
console.log('ok', Object.keys(T).length, 'tabelas');
