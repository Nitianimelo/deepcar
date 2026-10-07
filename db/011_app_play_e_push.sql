-- Deepcar · app Android 1.3.0: assinatura pela Google Play e notificações push (07/10/2026)
-- Rodar depois do 010. Pode rodar de novo: tudo idempotente.
-- Atenção ao divisor do scripts/migrar.mjs: cada comando termina com ";" no fim da linha.

-- Assinatura feita dentro do app (Google Play Billing). Fica em colunas próprias para não misturar com a Cakto:
-- quem paga pelo app tem assinatura_origem = 'play'; a Cakto nunca derruba essa conta, e o app nunca derruba a da Cakto.
alter table usuarios add column if not exists play_token text;
alter table usuarios add column if not exists play_produto text;
alter table usuarios add column if not exists play_expira_em timestamptz;
alter table usuarios add column if not exists play_estado text;
alter table usuarios add column if not exists play_conferido_em timestamptz;
-- um token de compra pertence a uma conta só (evita reaproveitar a compra de outra pessoa)
create unique index if not exists usuarios_play_token on usuarios (play_token) where play_token is not null;

-- Aparelhos que aceitaram notificação (token do Firebase Cloud Messaging). Um aparelho, uma conta: se outra conta
-- entrar no mesmo celular, o token passa para ela.
create table if not exists aparelhos_push (
  token text primary key,
  usuario_id uuid not null references usuarios(id) on delete cascade,
  plataforma text not null default 'android',
  criado_em timestamptz not null default now(),
  visto_em timestamptz not null default now()
);
create index if not exists aparelhos_push_usuario on aparelhos_push (usuario_id);

-- Avisos mandados pelo /admin (e o automático "teste acabou", marcado na conta para sair uma vez só).
create table if not exists notificacoes (
  id bigserial primary key,
  titulo text not null,
  texto text not null,
  publico text not null,
  aparelhos integer not null default 0,
  entregues integer not null default 0,
  enviado_por uuid references usuarios(id) on delete set null,
  enviado_em timestamptz not null default now()
);
alter table usuarios add column if not exists push_teste_acabou_em timestamptz;
