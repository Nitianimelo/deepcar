-- Deepcar · duração do teste gratuito editável no /admin → Planos (linha "free")
-- Rodar depois do 008. Pode rodar de novo: tudo idempotente.
-- Atenção ao divisor do scripts/migrar.mjs: cada comando termina com ";" no fim da linha.

-- minutos de teste a partir do primeiro acesso. Só vale na linha do plano free; vazio = padrão do código (600 = 10 h).
-- Mudar aqui vale para testes que COMEÇAM depois (quem já está no teste segue com o prazo que recebeu).
alter table planos_acesso add column if not exists minutos_teste integer check (minutos_teste is null or minutos_teste between 10 and 43200);
