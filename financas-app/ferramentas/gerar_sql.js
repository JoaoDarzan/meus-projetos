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
  const n = 'public.' + t.tabela;
  out.push(`-- ${aba}
create table if not exists ${n} (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
${t.colunas.map(([, col, tipo]) => `  ${col} ${tipo}${tipo === 'boolean' ? ' not null default false' : ''},`).join('\n')}
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
${t.colunas.map(([, col, tipo]) => `alter table ${n} add column if not exists ${col} ${tipo}${tipo === 'boolean' ? ' not null default false' : ''};`).join('\n')}
create index if not exists ${t.tabela}_user_id on ${n} (user_id);
alter table ${n} enable row level security;
drop policy if exists "so o dono" on ${n};
create policy "so o dono" on ${n} for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke all on ${n} from anon;
grant select, insert, update, delete on ${n} to authenticated;
drop trigger if exists marcar_atualizado on ${n};
create trigger marcar_atualizado before update on ${n} for each row execute function public.marcar_atualizado();
`);
});
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

select 'Pronto! Tabelas criadas.' as resultado;
`);
fs.writeFileSync(path.join(raiz, 'financas-app/supabase/esquema.sql'), out.join('\n'));
console.log('ok', Object.keys(T).length, 'tabelas');
