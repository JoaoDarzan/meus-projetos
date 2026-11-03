-- Darzan Finanças · atualização de novembro/2026: vendas (CRM) dentro do app.
-- Rode UMA vez no Supabase: SQL Editor → New query → cole tudo → Run. Pode rodar de novo sem problema.
-- (Tudo isto já está no esquema.sql; este arquivo é só o pedaço novo, para ficar mais fácil de colar.)

-- TRABALHOS: os dados da venda (de onde veio o cliente, último contato, orçamento, motivo de não fechar), num campo só
alter table public.trabalhos add column if not exists crm text;

select 'Pronto! Vendas (CRM) ligadas.' as resultado;
