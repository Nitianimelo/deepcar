-- Deepcar · assinaturas pagas pela Cakto
-- Rodar depois do 002. Pode rodar de novo: tudo idempotente.
-- Atenção ao divisor do scripts/migrar.mjs: cada comando termina com ";" no fim da linha.

-- ── Plano 'full' ────────────────────────────────────────────────────
-- O check do 001 só aceitava free/pro e o "create table if not exists" não o recria.
-- Não existe "add constraint if not exists", então derruba o antigo (seja qual for o nome
-- que o Postgres gerou) e recria com nome nosso.
do $$
declare nome text;
begin
  for nome in
    select conname from pg_constraint
     where conrelid = 'usuarios'::regclass and contype = 'c'
       and pg_get_constraintdef(oid) ilike '%plano%'
  loop
    execute format('alter table usuarios drop constraint %I', nome);
  end loop;
end $$;

alter table usuarios add constraint usuarios_plano_valido check (plano in ('free', 'pro', 'full'));

-- ── Assinatura de cada conta ────────────────────────────────────────
-- id da assinatura recorrente na Cakto; nulo = plano manual ou compra avulsa
alter table usuarios add column if not exists assinatura_id text;
-- pedido que liberou o plano: rastro para conferir com o painel da Cakto
alter table usuarios add column if not exists assinatura_pedido_id text;
-- cliente na Cakto: casa renovação e cancelamento mesmo se a pessoa trocar o e-mail
alter table usuarios add column if not exists cakto_cliente_id text;
-- plano realmente contratado ('pro' | 'full'); pode divergir de usuarios.plano se o admin mexer
alter table usuarios add column if not exists assinatura_plano text;
-- ativa | em_atraso | pausada | cancelada | reembolsada | chargeback | manual
alter table usuarios add column if not exists assinatura_status text;
-- próxima cobrança, quando a Cakto informa (só informativo: o corte vem do evento)
alter table usuarios add column if not exists assinatura_renova_em timestamptz;
-- subscription_late liga, subscription_late_recovered desliga. NÃO tira o acesso.
alter table usuarios add column if not exists assinatura_em_atraso boolean not null default false;
-- 'cakto' = veio do gateway, 'manual' = o admin decidiu. Um chargeback não desfaz decisão do admin.
alter table usuarios add column if not exists assinatura_origem text;
alter table usuarios add column if not exists assinatura_atualizada_em timestamptz;

create index if not exists usuarios_assinatura_id on usuarios (assinatura_id) where assinatura_id is not null;
create index if not exists usuarios_cakto_cliente on usuarios (cakto_cliente_id) where cakto_cliente_id is not null;

-- ── Eventos recebidos da Cakto ──────────────────────────────────────
-- Guarda tudo que chega: impede aplicar duas vezes a mesma entrega (a Cakto reenvia enquanto
-- não receber 2xx) e é o histórico que o /admin mostra quando alguém diz "paguei e não liberou".
-- id = sha-256 do corpo cru: a Cakto não manda um id de evento próprio, e data.id se repete
-- entre purchase_approved e subscription_created do mesmo pedido.
create table if not exists cakto_eventos (
  id            text primary key,
  evento        text not null,
  status        text not null default 'recebido'
                check (status in ('recebido', 'aplicado', 'pendente', 'ignorado', 'erro')),
  usuario_id    uuid references usuarios (id) on delete set null,
  email         text,
  assinatura_id text,
  pedido_id     text,
  produto_id    text,
  plano         text,
  valor         numeric(12, 2),
  corpo         jsonb not null,
  detalhe       text,
  recebido_em   timestamptz not null default now(),
  aplicado_em   timestamptz
);

create index if not exists cakto_eventos_recebido on cakto_eventos (recebido_em desc);
create index if not exists cakto_eventos_email on cakto_eventos (lower(email));
create index if not exists cakto_eventos_assinatura on cakto_eventos (assinatura_id) where assinatura_id is not null;

-- ── Pagamentos sem conta ────────────────────────────────────────────
-- Quem paga antes de se cadastrar (ou com outro e-mail) cai aqui. Não criamos conta sozinhos:
-- api/registrar.js consome a pendência quando a pessoa se cadastra com o mesmo e-mail, e o
-- /admin lista as abertas para vincular à mão.
create table if not exists assinaturas_pendentes (
  id            uuid primary key default gen_random_uuid(),
  email         text not null,
  nome          text,
  whatsapp      text,
  plano         text not null check (plano in ('pro', 'full')),
  assinatura_id text,
  pedido_id     text,
  produto_id    text,
  cliente_id    text,
  valor         numeric(12, 2),
  renova_em     timestamptz,
  status        text not null default 'pendente' check (status in ('pendente', 'aplicada', 'cancelada')),
  usuario_id    uuid references usuarios (id) on delete set null,
  evento_id     text,
  observacao    text,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  aplicada_em   timestamptz
);

-- uma pendência aberta por e-mail: a segunda compra do mesmo e-mail atualiza a primeira
create unique index if not exists assinaturas_pendentes_email_aberta on assinaturas_pendentes (lower(email)) where status = 'pendente';
create index if not exists assinaturas_pendentes_fila on assinaturas_pendentes (status, criado_em desc);
