-- Deepcar · app para iPhone (08/10/2026): assinatura pela App Store. Rodar depois do 016. Idempotente.
-- Mesma ideia das colunas play_* (db/011): conta paga no iPhone tem assinatura_origem = 'apple'; a Cakto e a Google não
-- mexem nela. O id da compra original da Apple liga as renovações (notificações da App Store) à conta.
alter table usuarios add column if not exists apple_tx_original text;
alter table usuarios add column if not exists apple_produto text;
alter table usuarios add column if not exists apple_expira_em timestamptz;
alter table usuarios add column if not exists apple_ambiente text;
create unique index if not exists usuarios_apple_tx on usuarios (apple_tx_original) where apple_tx_original is not null;
