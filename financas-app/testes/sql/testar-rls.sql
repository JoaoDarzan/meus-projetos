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

-- Acesso do Claude: só com a chave certa, só os dados do dono da chave
set role authenticated;
set request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000001';
insert into public.acesso_claude (id, hash) values ('aaaaaaaa-0000-0000-0000-000000000001', encode(sha256(convert_to('chave-do-joao', 'UTF8')), 'hex'));
insert into public.extrato (id, descricao, valor, banco) values ('C1', 'do joao', -10, 'Nubank');
set request.jwt.claim.sub = 'bbbbbbbb-0000-0000-0000-000000000002';
insert into public.extrato (id, descricao, valor) values ('C2', 'do outro', -99);
select 'outro não vê a chave do joão:', count(*) = 0 from public.acesso_claude;
reset role;
set role anon;
select pg_temp.espera_erro('select * from public.acesso_claude', 'sem login leu a chave');
select pg_temp.espera_erro($q$select public.claude_ler('chute', 'extrato')$q$, 'chave errada leu os dados');
select pg_temp.espera_erro($q$select public.claude_dono('chave-do-joao')$q$, 'qualquer um pode chamar claude_dono');
select pg_temp.espera_erro($q$select public.claude_ler('chave-do-joao', 'aparelhos')$q$, 'leu tabela não permitida');
select pg_temp.espera_erro($q$select public.claude_ler('chave-do-joao', 'acesso_claude')$q$, 'leu a tabela das chaves');
select pg_temp.espera_erro($q$select public.claude_gravar('chave-do-joao', '[{"tabela":"extrato","op":"salvar","linha":{"id":"C1","senha":"x"}}]')$q$, 'gravou coluna que não existe');
do $$ declare j json; begin
  j := public.claude_ler('chave-do-joao', 'extrato');
  if not (j::text like '%"C1"%') or j::text like '%"C2"%' or j::text like '%do outro%' then raise exception 'FALHOU: Claude leu errado: %', j; end if;
  -- corrige só a categoria; cria uma linha nova (mesmo mandando outro user_id); tenta mexer e apagar a linha de outra pessoa
  perform public.claude_gravar('chave-do-joao', '[{"tabela":"extrato","op":"salvar","linha":{"id":"C1","categoria":"Transporte"}},
    {"tabela":"extrato","op":"salvar","linha":{"id":"C3","descricao":"nova","valor":5,"user_id":"bbbbbbbb-0000-0000-0000-000000000002"}},
    {"tabela":"extrato","op":"salvar","linha":{"id":"C4","descricao":"vai sumir","valor":1}},
    {"tabela":"extrato","op":"salvar","linha":{"id":"C2","valor":0}},{"tabela":"extrato","op":"apagar","linha":{"id":"C2"}}]');
  perform public.claude_gravar('chave-do-joao', '[{"tabela":"extrato","op":"apagar","linha":{"id":"C4"}}]');
end $$;
-- ataques que o banco recusa: id com código, arquivo que não é "data:", gravar avisos com a chave, lote gigante
select pg_temp.espera_erro($q$select public.claude_gravar('chave-do-joao', '[{"tabela":"extrato","op":"salvar","linha":{"id":"x\" onfocus=\"alert(1)","valor":1}}]')$q$, 'aceitou id com código');
select pg_temp.espera_erro($q$select public.claude_gravar('chave-do-joao', '[{"tabela":"anexos","op":"salvar","linha":{"id":"XBAD","conteudo":"javascript:alert(1)"}}]')$q$, 'aceitou arquivo que não é data:');
select pg_temp.espera_erro($q$select public.claude_gravar('chave-do-joao', '[{"tabela":"equipamentos","op":"salvar","linha":{"id":"EBAD","foto":"https://site-falso/x.png"}}]')$q$, 'aceitou foto de fora');
select pg_temp.espera_erro($q$select public.claude_gravar('chave-do-joao', '[{"tabela":"avisos","op":"salvar","linha":{"id":"AVBAD","titulo":"golpe"}}]')$q$, 'a chave gravou um aviso');
select pg_temp.espera_erro($q$select public.claude_gravar('chave-do-joao', (select jsonb_agg(jsonb_build_object('tabela','extrato','op','apagar','linha',jsonb_build_object('id','Z'||g))) from generate_series(1,1001) g))$q$, 'aceitou lote gigante');
-- anexos: o Claude grava o arquivo, mas ao ler a tabela o arquivo (pesado) não vem junto
do $$ declare j json; begin
  perform public.claude_gravar('chave-do-joao', '[{"tabela":"anexos","op":"salvar","linha":{"id":"X1","trabalho":"J1","nome":"comprovante","conteudo":"data:image/jpeg;base64,AAAA"}}]');
  j := public.claude_ler('chave-do-joao', 'anexos');
  if not (j::text like '%"X1"%') or j::text like '%conteudo%' or j::text like '%base64%' then raise exception 'FALHOU: ler anexos trouxe o arquivo: %', j; end if;
end $$;
reset role;
do $$ begin
  if (select conteudo from public.anexos where id = 'X1') <> 'data:image/jpeg;base64,AAAA' then raise exception 'FALHOU: o arquivo do anexo não foi gravado'; end if;
  -- excluir o trabalho leva junto os anexos dele
  insert into public.trabalhos (id, user_id, cliente) values ('J1', 'aaaaaaaa-0000-0000-0000-000000000001', 'cliente');
  delete from public.trabalhos where id = 'J1';
  if exists (select 1 from public.anexos where id = 'X1') then raise exception 'FALHOU: excluir o trabalho deixou o anexo para trás'; end if;
  if (select categoria from public.extrato where id = 'C1') <> 'Transporte' or (select descricao from public.extrato where id = 'C1') <> 'do joao' or (select valor from public.extrato where id = 'C1') <> -10 then raise exception 'FALHOU: correção parcial'; end if;
  if (select user_id from public.extrato where id = 'C3') <> 'aaaaaaaa-0000-0000-0000-000000000001' then raise exception 'FALHOU: linha nova foi para outra pessoa'; end if;
  if (select valor from public.extrato where id = 'C2') <> -99 then raise exception 'FALHOU: mexeu na linha de outra pessoa'; end if;
  if exists (select 1 from public.extrato where id = 'C4') then raise exception 'FALHOU: não apagou'; end if;
  if (select ultimo_uso from public.acesso_claude) is null then raise exception 'FALHOU: não marcou o último uso'; end if;
end $$;
-- desligou o acesso: a chave para de funcionar
delete from public.acesso_claude;
set role anon;
select pg_temp.espera_erro($q$select public.claude_ler('chave-do-joao', 'extrato')$q$, 'chave desligada ainda funciona');
reset role;
select 'acesso do Claude só com a chave certa e só nos dados do dono' as resultado;
