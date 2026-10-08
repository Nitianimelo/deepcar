-- Deepcar · evento de ativação para a Meta (08/10/2026). Rodar depois do 015. Idempotente.
-- StartTrial pela API de Conversões na 1ª placa ou no 1º esquema aberto, uma vez por conta (api/_lib/meta.js → ativacaoMeta).
alter table usuarios add column if not exists meta_ativacao_em timestamptz;
