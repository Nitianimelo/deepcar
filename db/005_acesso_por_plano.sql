-- Deepcar · o que cada plano libera (sistemas, busca por placa e dispositivos)
-- Rodar depois do 004. Pode rodar de novo: tudo idempotente.
-- Atenção ao divisor do scripts/migrar.mjs: cada comando termina com ";" no fim da linha.

-- Editável no /admin → Planos. As chaves de `secoes` são as do menu (src/data/nav.ts):
-- injecao-leve, injecao-diesel, abs, eletrica, eletrica-diesel, cambio, cambio-diesel.
-- dispositivos = sessões abertas ao mesmo tempo; nulo = sem limite.
create table if not exists planos_acesso (
  plano          text primary key check (plano in ('free', 'pro', 'full')),
  secoes         text[] not null,
  placa          boolean not null default false,
  dispositivos   integer check (dispositivos is null or dispositivos >= 1),
  atualizado_em  timestamptz not null default now(),
  atualizado_por uuid references usuarios (id) on delete set null
);

-- valores da página de vendas; "do nothing" preserva o que o admin já mudou
insert into planos_acesso (plano, secoes, placa, dispositivos) values
  ('free', array['injecao-leve', 'injecao-diesel', 'abs', 'eletrica', 'eletrica-diesel', 'cambio', 'cambio-diesel'], true, 2),
  ('pro',  array['injecao-leve', 'abs', 'eletrica'], false, 2),
  ('full', array['injecao-leve', 'injecao-diesel', 'abs', 'eletrica', 'eletrica-diesel', 'cambio', 'cambio-diesel'], true, 4)
on conflict (plano) do nothing;

-- último uso de cada sessão: o /admin mostra os aparelhos e o limite derruba o mais antigo
alter table sessoes add column if not exists visto_em timestamptz;
