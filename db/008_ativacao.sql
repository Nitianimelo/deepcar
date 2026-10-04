-- Deepcar · ativação: quando cada conta deu os primeiros passos na plataforma (aparece no /admin)
-- Rodar depois do 007. Pode rodar de novo: tudo idempotente.
-- Atenção ao divisor do scripts/migrar.mjs: cada comando termina com ";" no fim da linha.

-- boas-vindas concluídas ou puladas (src/components/Funil.tsx), vindas do site por POST /api/sessao
alter table usuarios add column if not exists boas_vindas_em timestamptz;

-- primeira consulta por placa que deu certo: marcada pelo próprio servidor (api/placa)
alter table usuarios add column if not exists primeira_placa_em timestamptz;

-- primeiro esquema aberto (o acervo é lido direto do R2, então quem avisa é o site)
alter table usuarios add column if not exists primeiro_esquema_em timestamptz;
