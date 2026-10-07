-- Deepcar · teste grátis por consultas (07/10/2026)
-- Rodar depois do 009. Pode rodar de novo: tudo idempotente.
-- Atenção ao divisor do scripts/migrar.mjs: cada comando termina com ";" no fim da linha.

-- Uma linha por coisa DIFERENTE que a conta consultou (esquema aberto ou placa encontrada). Abrir de novo o mesmo
-- esquema ou a mesma placa não cria linha nem gasta consulta do teste. Vale para todos os planos (o CRM mostra).
create table if not exists consultas (
  usuario_id uuid not null references usuarios(id) on delete cascade,
  item text not null,
  tipo text not null check (tipo in ('esquema', 'placa')),
  em timestamptz not null default now(),
  primary key (usuario_id, item)
);

-- total de consultas diferentes da conta (o mesmo número da tabela acima, guardado para leitura rápida)
alter table usuarios add column if not exists consultas integer not null default 0;

-- o CRM de WhatsApp lê com um usuário só de leitura, por coluna: libera a contagem para ele
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'crm_leitura') then
    execute 'grant select (consultas) on usuarios to crm_leitura';
  end if;
end
$$;
