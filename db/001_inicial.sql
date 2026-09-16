-- Deepcar · esquema inicial (Neon/Postgres)
-- Rodar no editor SQL do Neon. Pode rodar de novo: tudo é "if not exists".

create extension if not exists pgcrypto;

-- ── Usuários ────────────────────────────────────────────────────────
-- senha: scrypt do Node, guardada como "scrypt$<sal>$<hash>" (nunca a senha em si).
create table if not exists usuarios (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  senha       text not null,
  nome        text not null,
  oficina     text not null default 'Minha oficina',
  plano       text not null default 'free' check (plano in ('free', 'pro')),
  papel       text not null default 'usuario' check (papel in ('usuario', 'admin')),
  ativo       boolean not null default true,
  criado_em   timestamptz not null default now(),
  visto_em    timestamptz
);

-- e-mail é único sem diferenciar maiúsculas
create unique index if not exists usuarios_email_unico on usuarios (lower(email));

-- ── Sessões ─────────────────────────────────────────────────────────
-- o cookie leva um token aleatório; aqui fica só o sha-256 dele.
create table if not exists sessoes (
  token      text primary key,
  usuario_id uuid not null references usuarios (id) on delete cascade,
  criado_em  timestamptz not null default now(),
  expira_em  timestamptz not null,
  agente     text
);

create index if not exists sessoes_usuario on sessoes (usuario_id);
create index if not exists sessoes_expira on sessoes (expira_em);

-- ── Segredos (chaves de API editáveis pelo /admin) ──────────────────
-- valor cifrado em AES-256-GCM com SEGREDOS_CHAVE, que fica na Vercel.
-- Nunca guardar aqui DATABASE_URL nem SESSAO_SEGREDO: são o que abre isto.
create table if not exists segredos (
  chave         text primary key,
  valor         text not null,
  descricao     text,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid references usuarios (id) on delete set null
);

-- ── Limpeza ─────────────────────────────────────────────────────────
-- sessões vencidas somem na primeira consulta depois do vencimento;
-- esta função existe para rodar à mão de vez em quando.
create or replace function limpar_sessoes() returns integer as $$
  with mortas as (delete from sessoes where expira_em < now() returning 1)
  select count(*)::int from mortas;
$$ language sql;
