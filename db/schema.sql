-- ─────────────────────────────────────────────────────────────────────────────
-- BANCO gestor — o motor
--
-- Cada coluna aqui existe por um episódio. As que parecem redundantes são as
-- que já custaram dinheiro por não existirem.
-- ─────────────────────────────────────────────────────────────────────────────

-- Gasto vindo da Meta, uma linha por (dia, nível, objeto).
CREATE TABLE IF NOT EXISTS spend (
  dia            TEXT NOT NULL,          -- AAAA-MM-DD no fuso da CONTA
  fuso_da_conta  TEXT NOT NULL,          -- explícito: sem isso não dá para comparar com a venda
  nivel          TEXT NOT NULL CHECK (nivel IN ('campanha','conjunto','anuncio')),
  objeto_id      TEXT NOT NULL,
  objeto_nome    TEXT,                   -- o nome vem INTEIRO pela API; a utm do clique vem cortada
  conta_id       TEXT NOT NULL,
  gasto          REAL NOT NULL,
  impressoes     INTEGER,
  cliques_link   INTEGER,                -- inline_link_clicks, nunca clicks
  updated_at     TEXT NOT NULL,          -- separa "não gastou" de "a carga não rodou"
  PRIMARY KEY (dia, nivel, objeto_id)
);
CREATE INDEX IF NOT EXISTS idx_spend_conta_dia ON spend (conta_id, dia);

-- Itens crus do webhook. NADA é agregado aqui: a agregação é função pura.
CREATE TABLE IF NOT EXISTS pedidos (
  pedido_id    TEXT PRIMARY KEY,         -- com order bump, cada item tem o seu
  checkout_id  TEXT NOT NULL,            -- a chave de contagem de VENDA
  conta_id     TEXT NOT NULL,
  tipo         TEXT NOT NULL CHECK (tipo IN ('front','backend')),
  status       TEXT NOT NULL CHECK (status IN ('pago','pendente','reembolsado')),
  valor        REAL NOT NULL,
  email        TEXT,
  cpf          TEXT,
  telefone     TEXT,
  bid          TEXT,                     -- o id de clique que credita a venda ao braço
  criado_em    TEXT NOT NULL,
  pago_em      TEXT,
  fuso_emissor TEXT NOT NULL,            -- o dia é o dia de quem EMITE
  recebido_em  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pedidos_checkout ON pedidos (checkout_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_bid ON pedidos (bid);

-- Identidade: e-mail, CPF e telefone normalizados apontando para a mesma pessoa.
-- É ela que responde quem comprou o ingresso e depois comprou o principal.
CREATE TABLE IF NOT EXISTS identidades (
  pessoa_id  TEXT NOT NULL,
  tipo       TEXT NOT NULL CHECK (tipo IN ('email','cpf','telefone')),
  valor      TEXT NOT NULL,              -- minúsculas; só dígitos em cpf/telefone
  visto_em   TEXT NOT NULL,
  PRIMARY KEY (tipo, valor)
);
CREATE INDEX IF NOT EXISTS idx_identidades_pessoa ON identidades (pessoa_id);

-- Propostas. Estados com nomes que NÃO se confundem: negada_pelo_dono é
-- terminal; barrada_pelo_sistema volta quando a trava soltar.
CREATE TABLE IF NOT EXISTS propostas (
  id            TEXT PRIMARY KEY,
  criada_em     TEXT NOT NULL,
  expira_em     TEXT NOT NULL,
  estado        TEXT NOT NULL CHECK (estado IN
                  ('pendente','aprovada_pelo_dono','negada_pelo_dono',
                   'barrada_pelo_sistema','expirada','executada')),
  acao          TEXT NOT NULL,
  conta_id      TEXT NOT NULL,
  campanha_id   TEXT NOT NULL,
  regra         TEXT NOT NULL,           -- qual regra decidiu
  motivo        TEXT NOT NULL,
  numeros_json  TEXT NOT NULL,           -- proposta sem número não vai para a tela
  aprovada_por  TEXT,
  executada_em  TEXT,
  readback_json TEXT                     -- a prova de que a Meta obedeceu
);
CREATE INDEX IF NOT EXISTS idx_propostas_estado ON propostas (estado, criada_em);

-- Resultado da auditoria. Auditoria que só aparece na tela não existe depois
-- que a aba fecha.
CREATE TABLE IF NOT EXISTS auditorias (
  em           TEXT PRIMARY KEY,
  criticos     INTEGER NOT NULL,
  atencao      INTEGER NOT NULL,
  achados_json TEXT NOT NULL
);

-- Conferência manual contra o Gerenciador de Anúncios. Enquanto não houver
-- linha aqui, nenhum número deste sistema foi conferido contra o dado bruto.
CREATE TABLE IF NOT EXISTS conferencias (
  em             TEXT PRIMARY KEY,
  dia_conferido  TEXT NOT NULL,
  campanha_id    TEXT NOT NULL,
  gasto_sistema  REAL NOT NULL,
  gasto_painel   REAL NOT NULL,
  divergencia    REAL NOT NULL,
  quem           TEXT NOT NULL
);

-- ─────────────────────────────────────────────────────────────────────────────
-- BANCO rastreio — o link inteligente
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS bracos (
  id          TEXT PRIMARY KEY,
  experimento TEXT NOT NULL,
  destino     TEXT NOT NULL,
  ativo       INTEGER NOT NULL DEFAULT 1,
  controle    INTEGER NOT NULL DEFAULT 0,   -- para onde ir quando tudo falhar
  criado_em   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cliques (
  bid         TEXT PRIMARY KEY,
  experimento TEXT NOT NULL,
  braco_id    TEXT NOT NULL,
  ad_id       TEXT,
  campanha    TEXT,                        -- pelo NOME via API, nunca pela utm cortada
  pais        TEXT,
  user_agent  TEXT,
  marca       TEXT,                        -- 'suspeito_revisao_da_meta' aparece na tela
  contado     INTEGER NOT NULL DEFAULT 1,  -- robô conhecido entra com 0, não some
  em          TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cliques_braco ON cliques (experimento, braco_id, em);

-- ─────────────────────────────────────────────────────────────────────────────
-- BANCO quiz-eventos — o funil
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS eventos_funil (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id  TEXT NOT NULL,               -- conta-se PESSOA, não evento
  tela_numero INTEGER NOT NULL,
  tela_nome   TEXT NOT NULL,
  variante    TEXT,
  bid         TEXT,
  ad_id       TEXT,                        -- sem ele, comparar braços é comparar públicos
  em          TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_eventos_sessao ON eventos_funil (session_id, tela_numero);
CREATE INDEX IF NOT EXISTS idx_eventos_tela ON eventos_funil (tela_numero, em);
