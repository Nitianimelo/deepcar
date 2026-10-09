-- Deepcar · consultas extras no teste (09/10/2026): o dono libera "+N consultas" para uma conta (pelo CRM/WhatsApp,
-- como oferta para quem gastou o teste). O limite do teste da conta passa a ser consultas_teste + consultas_extra.
-- Rodar depois do 018. Idempotente.
alter table usuarios add column if not exists consultas_extra integer not null default 0;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'crm_leitura') then
    execute 'grant select (consultas_extra) on usuarios to crm_leitura';
  end if;
end $$;
