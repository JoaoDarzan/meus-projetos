-- Liga os avisos no celular de tudo que entra e sai pelo banco (Open Finance). Rodar uma vez:
-- Supabase → SQL Editor → New query → colar tudo → Run. Pode rodar mais de uma vez sem problema.
-- O que muda: a chave do robô passa a poder gravar SÓ avisos do tipo "banco" (id começando com VOF-).
-- Os outros avisos (tarefas, contas) continuam sendo só o app que agenda. Nada mais muda.

-- gravar ou apagar linhas do dono da chave: [{"tabela": "extrato", "op": "salvar"|"apagar", "linha": {"id": ..., colunas...}}]
-- "salvar" só mexe nas colunas que vierem; linha nova é criada para o dono; linha de outra pessoa nunca é tocada
create or replace function public.claude_gravar(p_chave text, p_ops jsonb) returns json language plpgsql security definer set search_path = '' as $$
declare u uuid := public.claude_dono(p_chave); o jsonb; t text; l jsonb; cols text[]; c text; n int; feitos int := 0;
begin
  if jsonb_typeof(p_ops) <> 'array' or jsonb_array_length(p_ops) > 1000 then raise exception 'mande no máximo 1000 mudanças por vez'; end if;
  for o in select * from jsonb_array_elements(p_ops) loop
    t := o->>'tabela'; l := o->'linha';
    if not public.claude_tabela_ok(t) then raise exception 'tabela não permitida: %', t; end if;
    if t = 'avisos' and not (o->>'op' = 'salvar' and l->>'tipo' = 'banco' and left(coalesce(l->>'id', ''), 4) = 'VOF-') then raise exception 'a chave só grava avisos do banco (VOF-...); os outros avisos só o app agenda'; end if;
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

select 'Pronto! Avisos do banco ligados.' as resultado;
