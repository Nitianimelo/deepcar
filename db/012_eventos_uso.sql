-- Deepcar · registro do que a pessoa faz no site e no app (07/10/2026), visto no /admin → Logs.
-- Rodar depois do 011. Pode rodar de novo: tudo idempotente.
-- Atenção ao divisor do scripts/migrar.mjs: cada comando termina com ";" no fim da linha.

-- O navegador junta os eventos e manda em lote (src/lib/log.ts → POST /api/sessao { evento: 'log' }), poucas vezes por
-- visita, para não gastar chamadas da Vercel. Visitante sem conta fica só com o id anônimo do navegador (o mesmo do pixel).
create table if not exists eventos_uso (
  id bigserial primary key,
  usuario_id uuid references usuarios(id) on delete cascade,
  visitante text,
  tipo text not null,
  detalhe jsonb,
  rota text,
  aparelho text,
  em timestamptz not null default now()
);
create index if not exists eventos_uso_em on eventos_uso (em desc);
create index if not exists eventos_uso_usuario on eventos_uso (usuario_id, em desc);
create index if not exists eventos_uso_tipo on eventos_uso (tipo, em desc);
