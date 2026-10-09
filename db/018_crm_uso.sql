-- Deepcar · o CRM (crm.deepcar.app.br) passa a ler também o uso de cada pessoa (09/10/2026): app instalado e versão,
-- aparelho do cadastro, placas consultadas, sistemas abertos, última atividade, erros de login, planos vistos.
-- Só leitura, pelo usuário crm_leitura (criado fora das migrações). Idempotente.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'crm_leitura') then
    execute 'grant select (visto_em) on usuarios to crm_leitura';
    execute 'grant select (usuario_id, tipo, detalhe, rota, aparelho, em) on eventos_uso to crm_leitura';
    execute 'grant select (usuario_id, plataforma, visto_em) on aparelhos_push to crm_leitura';
    execute 'grant select on consultas to crm_leitura';
    execute 'grant select (plano, consultas_teste) on planos_acesso to crm_leitura';
  end if;
end $$;
