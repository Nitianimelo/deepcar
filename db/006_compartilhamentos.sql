-- Deepcar · links de compartilhamento de esquema (abrem 2 vezes e expiram)
-- Rodar depois do 005. Pode rodar de novo: tudo idempotente.
-- Atenção ao divisor do scripts/migrar.mjs: cada comando termina com ";" no fim da linha.

-- token = sha-256 do código do link (como nas sessões): o banco sozinho não abre nenhum link.
-- visitantes = { id do aparelho: primeira abertura (ISO) }. O mesmo aparelho recarregando a página
-- dentro de 2 horas não gasta outra abertura (api/compartilhar.js).
create table if not exists compartilhamentos (
  token              text primary key,
  usuario_id         uuid references usuarios (id) on delete cascade,
  esquema_id         text not null,
  titulo             text,
  limite             integer not null default 2 check (limite >= 1),
  aberturas          integer not null default 0,
  visitantes         jsonb not null default '{}'::jsonb,
  criado_em          timestamptz not null default now(),
  ultima_abertura_em timestamptz
);

create index if not exists compartilhamentos_usuario on compartilhamentos (usuario_id, criado_em desc);
