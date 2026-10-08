-- Deepcar · quantidade de consultas do teste no /admin e placa depois do teste (08/10/2026). Rodar depois do 014.
-- Pode rodar de novo: tudo idempotente. Cada comando termina com ";" no fim da linha (scripts/migrar.mjs).

-- /admin → Planos, linha "Esquemas no teste" (só na linha free). Vazio = padrão do código (5).
alter table planos_acesso add column if not exists consultas_teste integer;

-- Teste encerrado continua consultando placa (ficha + esquemas borrados). A placa custa cota do provedor: no máximo
-- algumas placas diferentes por dia por conta (api/placa/[placa].js). Uma linha por conta × placa.
create table if not exists placas_teste_vencido (
  usuario_id uuid not null references usuarios(id) on delete cascade,
  placa text not null,
  em timestamptz not null default now(),
  primary key (usuario_id, placa)
);
