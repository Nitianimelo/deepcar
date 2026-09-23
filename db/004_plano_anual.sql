-- Deepcar · plano anual (Pro Anual e Full Anual, pagamento único parcelável em até 12x)
-- Rodar depois do 003. Pode rodar de novo: tudo idempotente.
-- Atenção ao divisor do scripts/migrar.mjs: cada comando termina com ";" no fim da linha.

-- 'mensal' = assinatura recorrente da Cakto (o corte vem do evento de cancelamento)
-- 'anual'  = compra única de 12 meses (o corte vem de plano_expira_em, conferido a cada acesso)
alter table usuarios add column if not exists assinatura_ciclo text;
-- até quando vale a compra anual; nulo no mensal e no plano dado à mão
alter table usuarios add column if not exists plano_expira_em timestamptz;

-- quem pagou o anual antes de ter conta: o ciclo precisa chegar junto com o plano
alter table assinaturas_pendentes add column if not exists ciclo text;

-- tudo que existia antes deste arquivo era mensal
update usuarios set assinatura_ciclo = 'mensal' where assinatura_ciclo is null and assinatura_origem = 'cakto';
update assinaturas_pendentes set ciclo = 'mensal' where ciclo is null;
