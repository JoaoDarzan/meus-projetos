-- Atualização de segurança (novembro/2026). Rodar uma vez: Supabase → SQL Editor → New query → colar tudo → Run.
-- Fecha a última função do banco que respondia a qualquer pessoa na internet. Ela não mostrava dados,
-- só dizia se o nome de uma tabela existe, mas não há motivo para ficar aberta: só o Acesso do Claude usa, por dentro.
revoke all on function public.claude_tabela_ok(text) from public, anon, authenticated;
select 'pronto: segurança atualizada' as resultado;
