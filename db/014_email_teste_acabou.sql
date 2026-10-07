-- Deepcar · e-mail "seu teste acabou" (07/10/2026). Rodar depois do 013. Idempotente.
-- Marca na conta para sair uma vez só (como push_teste_acabou_em).
alter table usuarios add column if not exists email_teste_acabou_em timestamptz;
