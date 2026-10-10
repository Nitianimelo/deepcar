-- /admin → Logs (10/10/2026): a origem de cada linha é a primeira visita com campanha (UTM/fbclid) da mesma pessoa,
-- procurada pelo id do visitante. Sem este índice, a busca varreria a tabela inteira para cada linha.
create index if not exists eventos_uso_visitante on eventos_uso (visitante, em);
