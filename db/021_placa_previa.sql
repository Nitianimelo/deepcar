-- Deepcar · prévia da placa na página de vendas, sem conta (09/10/2026): a pessoa digita a placa e vê o veículo e os
-- sistemas que existem para ele (nunca o esquema). Cada consulta custa cota do provedor de placas, então há limite por
-- IP (3 placas novas a cada 24 h) e um teto geral por dia (api/placa/[placa].js → previaPlaca). Rodar depois do 020.
create table if not exists placas_previa (
  id bigserial primary key,
  ip text not null,
  visitante text,
  placa text not null,
  em timestamptz not null default now()
);
create index if not exists placas_previa_ip on placas_previa (ip, em desc);
create index if not exists placas_previa_em on placas_previa (em desc);
