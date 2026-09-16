-- Deepcar · WhatsApp no cadastro e janela do plano free
-- Rodar depois do 001. Pode rodar de novo: tudo é "if not exists".

-- WhatsApp de quem assina a conta. Guardado só em dígitos, com DDI: 5511912345678.
alter table usuarios add column if not exists whatsapp text;

-- Fim do teste gratuito. Nulo = ainda não começou: o relógio parte no primeiro acesso,
-- não na criação da conta, para quem cadastra e só volta no dia seguinte não perder nada.
-- Só é lido quando plano = 'free'; virar 'pro' ignora o campo.
alter table usuarios add column if not exists free_expira_em timestamptz;

-- usado pelo /admin para achar quem está com o teste correndo
create index if not exists usuarios_free_expira on usuarios (free_expira_em)
  where free_expira_em is not null;
