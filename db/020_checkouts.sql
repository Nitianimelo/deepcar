-- Deepcar · checkout aberto pelo site (09/10/2026): funil Meta → página → checkout da Cakto, com ou sem conta.
-- Cada clique em "Assinar" ganha um id (vai no link da Cakto como `sck` e volta no webhook dentro de checkoutUrl).
-- Guardamos o navegador de quem clicou (fbp, fbc, ip, user agent, visitante anônimo e a origem do anúncio) para a
-- compra ser ligada ao anúncio mesmo quando a pessoa ainda não tem conta (Purchase pela API de Conversões).
-- Rodar depois do 019. Idempotente.
create table if not exists checkouts (
  id text primary key,
  usuario_id uuid references usuarios(id) on delete set null,
  visitante text,
  plano text not null,
  ciclo text not null,
  valor numeric,
  navegador jsonb,
  origem jsonb,
  rota text,
  criado_em timestamptz not null default now(),
  pago_em timestamptz,
  pedido_id text
);
create index if not exists checkouts_criado on checkouts (criado_em desc);
