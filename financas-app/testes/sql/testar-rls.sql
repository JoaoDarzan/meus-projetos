-- Testa as regras de segurança do esquema.sql. Qualquer falha para o teste com erro.
\set ON_ERROR_STOP 1
create or replace function pg_temp.espera_erro(sql text, msg text) returns void language plpgsql as $$
begin
  begin execute sql; exception when others then return; end;
  raise exception 'FALHOU: %', msg;
end $$;
grant execute on function pg_temp.espera_erro(text, text) to anon, authenticated;

set role anon;
select pg_temp.espera_erro('select count(*) from public.extrato', 'sem login conseguiu ler o extrato');
select pg_temp.espera_erro($q$insert into public.extrato (id) values ('X')$q$, 'sem login conseguiu gravar');
select pg_temp.espera_erro('select * from public.sinal_de_vida', 'sem login leu o sinal de vida');
do $$ begin if public.manter_ativo() is null then raise exception 'FALHOU: manter_ativo'; end if; end $$;
reset role;

set role authenticated;
set request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000001';
insert into public.extrato (id, data, descricao, valor, parcela) values ('T1', '2026-10-27', 'gasolina', -25.9, '1/3');
insert into public.extrato (id, valor) values ('T1', -30) on conflict (id) do update set valor = excluded.valor;
do $$ begin
  if (select count(*) from public.extrato) <> 1 then raise exception 'FALHOU: dono não vê a própria linha'; end if;
  if (select valor from public.extrato where id = 'T1') <> -30 then raise exception 'FALHOU: atualizar'; end if;
  if (select descricao from public.extrato where id = 'T1') <> 'gasolina' then raise exception 'FALHOU: atualizar apagou outra coluna'; end if;
  if (select user_id from public.extrato where id = 'T1') <> 'aaaaaaaa-0000-0000-0000-000000000001' then raise exception 'FALHOU: dono gravado errado'; end if;
end $$;

set request.jwt.claim.sub = 'bbbbbbbb-0000-0000-0000-000000000002';
do $$ begin
  if (select count(*) from public.extrato) <> 0 then raise exception 'FALHOU: outra pessoa viu os dados'; end if;
  update public.extrato set valor = 0 where id = 'T1';
  delete from public.extrato where id = 'T1';
end $$;
select pg_temp.espera_erro($q$insert into public.extrato (id, valor) values ('T1', 1) on conflict (id) do update set valor = excluded.valor$q$, 'outra pessoa sobrescreveu');
select pg_temp.espera_erro($q$insert into public.extrato (id, user_id, valor) values ('T2', 'aaaaaaaa-0000-0000-0000-000000000001', 1)$q$, 'outra pessoa gravou em nome do dono');

set request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000001';
do $$ begin
  if (select valor from public.extrato where id = 'T1') <> -30 then raise exception 'FALHOU: outra pessoa mexeu na linha'; end if;
end $$;
reset role;
select 'todas as regras de segurança funcionam' as resultado;

-- avisos: só com o segredo certo (o teste usa o segredo "segredo-de-teste")
insert into public.config_servidor values ('avisos_hash', encode(sha256(convert_to('segredo-de-teste', 'UTF8')), 'hex')) on conflict (chave) do update set valor = excluded.valor;
set role authenticated;
set request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000001';
insert into public.avisos (id, quando, titulo, corpo) values ('AV1', '2026-10-27', 'Hoje: pagar luz', 'R$ 140,00'), ('AV2', '2026-10-29', 'Depois', 'x');
insert into public.aparelhos (id, endpoint, p256dh, auth) values ('D1', 'https://push.exemplo/1', 'p', 'a');
reset role;
set role anon;
select pg_temp.espera_erro('select * from public.avisos', 'sem login leu os avisos');
select pg_temp.espera_erro('select * from public.config_servidor', 'sem login leu o segredo');
select pg_temp.espera_erro($q$select public.avisos_pendentes('errado', '2026-10-27')$q$, 'segredo errado leu os avisos');
select pg_temp.espera_erro($q$select public.segredo_ok('segredo-de-teste')$q$, 'qualquer um pode testar segredos');
do $$ declare j json; begin
  j := public.avisos_pendentes('segredo-de-teste', '2026-10-27');
  if json_array_length(j->'avisos') <> 1 or j->'avisos'->0->>'id' <> 'AV1' then raise exception 'FALHOU: avisos do dia: %', j; end if;
  if json_array_length(j->'aparelhos') <> 1 then raise exception 'FALHOU: aparelhos'; end if;
  if public.avisos_enviados('segredo-de-teste', array['AV1']) <> 1 then raise exception 'FALHOU: marcar enviado'; end if;
  if json_array_length(public.avisos_pendentes('segredo-de-teste', '2026-10-27')->'avisos') <> 0 then raise exception 'FALHOU: mandou 2 vezes'; end if;
end $$;
reset role;
select 'avisos só com o segredo certo' as resultado;
