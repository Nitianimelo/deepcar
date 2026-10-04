-- Deepcar · de onde cada conta veio e como reconhecê-la na Meta
-- Rodar depois do 006. Pode rodar de novo: tudo idempotente.
-- Atenção ao divisor do scripts/migrar.mjs: cada comando termina com ";" no fim da linha.

-- origem = primeiro toque antes do cadastro: utm_source/medium/campaign/content/term, fbclid, gclid,
-- página de entrada, site que mandou (referrer) e quando. Só vem de cadastros feitos pelo site.
alter table usuarios add column if not exists origem jsonb;

-- rastreio_meta = { fbp, fbc, ip, navegador } do cadastro. A compra chega pelo webhook da Cakto (servidor a servidor),
-- sem navegador; com isto o Purchase vai para a Meta com o mesmo "rosto" do clique no anúncio (api/_lib/meta.js).
alter table usuarios add column if not exists rastreio_meta jsonb;
