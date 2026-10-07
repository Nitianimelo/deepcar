-- Deepcar · e-mails: recuperação de senha e boas-vindas (07/10/2026)
-- Rodar depois do 012. Pode rodar de novo: tudo idempotente.
-- Atenção ao divisor do scripts/migrar.mjs: cada comando termina com ";" no fim da linha.

-- Pedido de nova senha: só o sha-256 do código do link fica no banco; vale 1 hora e uma vez só.
create table if not exists redefinicoes_senha (
  token text primary key,
  usuario_id uuid not null references usuarios(id) on delete cascade,
  criado_em timestamptz not null default now(),
  expira_em timestamptz not null,
  usado_em timestamptz
);
create index if not exists redefinicoes_senha_usuario on redefinicoes_senha (usuario_id, criado_em desc);

-- e-mail de boas-vindas mandado (uma vez por conta)
alter table usuarios add column if not exists email_boas_vindas_em timestamptz;
