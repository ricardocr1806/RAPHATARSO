# Estado

> Reescrito ao fim de cada trabalho. Não é diário: responde "como está a
> operação agora". O histórico mora nos commits.

**Atualizado em:** 2026-09-16
**Fase atual:** 02 fechada (doutrina em código). Passos 1, 2, 7, 8 e 9 do
briefing ainda não têm serviço no ar.

## Em uma linha

O núcleo que decide está escrito, testado e resistiu a 15 defeitos
reintroduzidos de propósito — mas nada disso tocou a Meta ainda, e as duas
conferências contra o dado bruto continuam vermelhas.

## A verdade, ancorada

| | |
|---|---|
| Fonte da verdade | webhook de venda **PAGA**, agrupado por `checkout_id` |
| Painel informativo | atribuição da Meta — infla de 1,59x a 3,5x, nunca decide |
| Denominador do custo | **somente vendas de FRONT pagas** |
| Fronteira do dia | fuso de quem EMITE a venda |
| Taxa de pagamento observada | ~0,68 |
| Pendentes por idade do dia | hoje 42% · ontem 10% · anteontem 5% |

Detalhe e as seis perguntas respondidas: `docs/FASE-01-VERDADE.md`.

## O que existe, e é código rodando

| Peça | Arquivo |
|---|---|
| Fronteira de tempo e fusos | `src/tempo.js` |
| Doutrina portável (8 regras puras, com `agruparEmCheckouts`) | `src/doutrina.js` |
| Vendas: checkout, front/backend, pendentes | `src/vendas.js` |
| As 16 regras como dados, e o motor que as consulta | `src/regras.js`, `src/decisao.js` |
| Graph API com degradação, read-back e rate limit | `src/meta/campos.js`, `src/meta/escrita.js` |
| Bandit, funil (Wilson), blocos de 90, GLOB no lugar de LIKE | `src/bandit.js`, `src/funil.js`, `src/lote.js`, `src/sql.js` |
| Read-back com segunda chance, auditoria que não engole exceção | `src/readback.js`, `src/auditoria.js` |

```
npm test      # 118 testes, sem dependências externas
npm run mutacao   # 18 defeitos reintroduzidos, todos precisam ficar VERMELHOS
npm run auditoria # 9 verificações, resultado gravado em .auditoria/ultima.json
```

## Vermelho agora, e por quê

Resta **1 crítica**: `gasto_conferido_com_o_gerenciador` — ninguém comparou o
gasto de ontem de três campanhas com o Gerenciador, ao centavo. Grave em
`.conferencias/gerenciador.json`. Pela regra 16, nenhum número daqui vira
proposta enquanto isso.

`order_bump_conferido` ficou VERDE em 30/09 — não por compra de teste, mas por
conferência contra produção: 86 bumps reais, todos com pedido principal do mesmo
comprador em menos de 300s, e a regra sobre as 1.193 linhas devolve 0 órfãos.
Registro em `.conferencias/order-bump.json`, que é local (`.gitignore`).

E **1 de atenção**: `versao_no_ar` — nenhum processo no ar declara versão.

## O que NÃO existe ainda

- Nenhum Worker, banco provisionado ou cron do motor. O núcleo é puro e espera
  adaptadores: passos 1 (carga de gasto), 2 (webhook de venda), 7 (link
  inteligente) e 8 (api do funil) têm lógica escrita e testada, falta a borda de
  rede e as credenciais. Passos 9 (telas) e 4 (identidade): só o schema.
- `config.contas` só tem a entrada de exemplo, inativa — sem conta preenchida o
  motor não decide nada.

## Números que valem hoje

- 0 escritas na Meta feitas por este sistema.
- 0 propostas na fila.
- 0 gatilhos com execução automática — a lista está vazia de propósito.
- 60 armadilhas com preço; 18 delas com mutação que prova a trava.

**Conta CA3 em 29/09/2026:** **zero campanhas ativas.** Todas PAUSED, incluindo a
`[67-CBO][Quiz normal-Bloqueio2] 11-08` (R$ 750/dia) e as três que eu criei — a
CBO de 17/09 `120250507911370459`, a de 29/09 `120250683788910459`, e a ABO
`120250507792940459`, que foi erro meu e aguarda decisão de excluir.

**Campanha principal, 20-26/09, agora CONFERIDA contra venda paga:**

| | Meta diz | conferido |
|---|--:|--:|
| vendas | 104 | **79** |
| CPA | R$ 50,48 | **R$ 66,45** |
| receita | R$ 6.968,00 | R$ 4.994,90 |

Gasto R$ 5.249,92. **A Meta vê 1,32x a venda real** — muito acima do 0,87x que
eu vinha usando por destino, que era estimativa de outra janela. Margem no front
**−R$ 255,02**: o front está no vermelho, não no empate. Limite do erro: 82
vendas conferidas na janela, 79 da principal, 1 sem `ad_id` — no melhor caso o
CPA seria R$ 65,62, ainda bem acima do que a Meta reporta.

## Achados na operação que está no ar (conta CA3)

Conferido contra a Graph API e os bancos D1 `gestor`, `quiz-eventos` e
`dashboardquiz-db`. **Onde mora o dado do quiz da CA3:** `dashboardquiz-db`, não
`quiz-eventos`. Cinco quizzes (`quizzes.id` 5 a 9) cobrem cinco dos sete destinos
dos anúncios; `quizmentem` e `quizz` (R$ 1.010,07 na janela) não têm quiz
cadastrado.

**A CA3 continua fora da carga de gasto** (`gestor.spend` cobre 4 contas, não
esta) e o motor não vê a venda: das 421 pagas da janela 31/07-29/08, 181 não
existem em `gestor.orders`. Elas existem no `dashboardquiz-db`, com o anúncio no
payload — é por lá que se confere, não pelo motor.

**Defeitos do dashboard ainda de pé:** `sales.amount` é o valor do ITEM, então
receita só fecha somando o bump dentro do checkout; 174 linhas sem `txn_id`,
todas não pagas. O contador `quizzes.purchase` foi corrigido em 30/09.

**A capa: o contador de entrada infla.** `entry` dispara no `PageView` em
`bloqueio`, `bloqueios2` e `desafio2`, contando recarga, prefetch e robô — infla
de 41% a 54% contra o clique pago. Já `desafio` (V1) só conta na primeira
interação real: comparar os dois é comparar definições, não capas. Com o
denominador honesto (cliques no link), quem chega e responde a primeira pergunta:
bloqueios2 56,5% · desafio2 48,4% · bloqueio 42,8% · desafio V1 42,1%.

**A escada de etapas não cobre o funil.** O contador só avança em
`QuizAnswer`: o Desafio V2 tem 54 telas e 34 degraus; o Desbloqueio, 33 telas e
26 degraus. As telas cegas — presente, prova, formulário, carregamento,
resultado — são onde a perda mora: 21,3% no formulário e 6,7%/6,4%/5,6% nos
pares presente+prova, contra ~1% por pergunta. Um quarto par (Presente 4)
derruba só 0,3%: mesmo desenho, dez vezes menos perda. No Desbloqueio, os 71%
entre a última pergunta (2.930) e o clique em comprar (843) não têm degrau.

**PIXEL LIMPO (corrigido em 27/09).** `bloqueio` e `bloqueios2` mandavam toda
ação do lead ao pixel `4856275891285933` — 208.679 eventos em 8 dias, venda em
0,4%. Trocado por allowlist `['Purchase']` no `track()`; como quem dispara
`Purchase` é o checkout, as páginas passaram a mandar ZERO evento. Read-back
contra a Meta, janela igual antes e depois: `bloqueios2` saiu da lista de origens
e `bloqueio` caiu a 1 em 40 minutos. Detalhe e rollback em
`docs/CORRECAO-PIXEL.md`. O que resta nesse pixel é `feridas.valeriatarso.com`
(outro site) e o checkout.

### O pixel duplica de verdade — mas não no evento que vira Resultado (30/09)

`/{pixel}/stats?aggregation=event_source&event=<Nome>`, 20-26/09, pixel
`1130253591753543`: PageView 495 navegador + 421 servidor · InitiateCheckout
344 + 367 · AddPaymentInfo 17 + 17 · **Purchase 0 + 106**.

Tudo chega duas vezes, pelo navegador e pelo servidor, **menos a venda** — essa
vem só do servidor. Como a coluna Resultados conta PURCHASE, a duplicação
visível no Gerenciador de Eventos não é o que infla o resultado.

O que infla é outra coisa, medida: 106 eventos de `Purchase` contra **84
transações pagas** que o webhook recebeu (73 de R$ 67 + 11 de R$ 39,90), e a Meta
avalia TODA compra em exatamente R$ 67,00 (R$ 7.035,00 / 105) — o bump é
invisível para ela. Não é atribuição: 101 das 105 são clique de 1 dia.

Quem manda pelo servidor não é a UTMify (sem integração nesta conta) nem página
nossa: é a integração de pixel da plataforma de checkout, que não tem API
(`api.onprofit.com.br` responde a home do site). **O ajuste é no painel deles** —
desligar um dos dois lados ou pôr o mesmo `event_id` nos dois.

### O Gerenciador já conta somente venda (conferido 27/09/2026)

Os **200 conjuntos** apontam para o mesmo evento de resultado — 113 em
OFFSITE_CONVERSIONS e 87 em VALUE, todos PURCHASE no pixel `1130253591753543`.
Nenhum otimiza lead, clique ou engajamento.

### O painel agora marca conversão (corrigido 30/09, read-back conferido)

`quizzes.purchase` estava **0 nos cinco** desde sempre — o único contador que
nunca foi escrito (`entries`, `clicks` e `buyclick` são mantidos). Gravado o
número certo: bloqueios2 289 · desbloqueio 216 · lpdmm 117 · desafio 23 ·
desafio2 18. Total 663, receita R$ 46.884,90. A regra virou `agruparEmCheckouts` em
`src/doutrina.js` (7 testes, 3 mutações) e roda sobre as 1.193 linhas reais:
663 nos cinco quizzes, 186 nos destinos sem quiz, **0 bumps órfãos**. As três
contagens possíveis: LINHA 912, TRANSAÇÃO 746, CHECKOUT 663.

**Ressalva:** o código do painel não está nesta conta Cloudflare (nenhum Worker
ou Pages liga o `dashboardquiz-db`) e o token não lê DNS — não dá para ver se ele
LÊ essa coluna nem para fazê-la se atualizar sozinha. O número está certo hoje;
mantê-lo certo exige o webhook incrementar ou um job horário recalculando.

**O que faz aparecer engajamento, vídeo e clique na tela é a PREDEFINIÇÃO DE
COLUNAS**, não o que a conta conta. A API devolve sempre ~60 `action_type` e a
interface mostra os que a predefinição pedir. É ajuste de visualização por
usuário e **não tem endpoint na Marketing API** — só na interface (Colunas →
Personalizar colunas → salvar como predefinição). Não é executável por aqui.

**Financeiro:** estava em `account_status=9` (carência) em 30/08; hoje ATIVA, com saldo devedor de R$ 1.877,21.

### A atribuição anúncio → venda NÃO está morta (achado de 29/09/2026)

O que estava morto era `gestor.orders`. A venda paga chega ao `dashboardquiz-db`
com o anúncio no payload: `sales.raw` traz `utm_content = "<nome>|<ad_id>"`, mais
campanha e conjunto, em **920 transações pagas de 17/07 a 27/09, 100% de
cobertura**, 830 casando com anúncio da CA3 — Assiny e OnProfit, o webhook é o
mesmo. **Criativo passa a ser avaliado por VENDA PAGA conferida, não pela compra
que a Meta reporta.** Para refazer: agrupar por CHECKOUT (`agruparEmCheckouts`),
janela de gasto igual à da venda, `amount` em CENTAVOS.

Reagrupando pela mídia real, **17 criativos têm 3 ou mais vendas pagas
conferidas** na janela 17/07-26/09. Os 12 melhores por CPA real ficam todos
abaixo do ticket de R$ 67,00 — de R$ 13,08 a R$ 64,24.

**Tudo isso só existe porque a UTM carrega `{{ad.id}}`.** Anúncio novo sem
`url_tags` completo volta a ser cego por criativo.

### Campanha criada em 29/09 — PAUSADA, na CA3 (`act_894212022756623`)

Criativos com bom resultado em venda para `desafio2`, em 1 campanha × 3
conjuntos × 4 criativos DIFERENTES e validados por conjunto.

- **`120250683788910459`** · `[67-CBO][12 VALIDADOS POR VENDA PAGA][Desafio2] 29-09`
- CBO **R$ 300/dia**, OUTCOME_SALES. 3 conjuntos `[Validados] — 01/02/03` sem
  orçamento próprio, otimização **OFFSITE_CONVERSIONS** (não VALUE: o desafio2
  fez 18 vendas no melhor mês), pixel 1130253591753543 PURCHASE, 1 dia de
  clique, BR 18-65.
- 12 anúncios, **12 criativos e 12 mídias distintas**, `url_tags` completo —
  read-back conferiu o `{{ad.id}}`, tudo `PAUSED`, gasto R$ 0,00. Serpentina por
  CPA real deixa os conjuntos comparáveis (39,57 / 41,25 / 43,17).
- Os 12 são os melhores por CPA REAL (venda paga conferida, 17/07-26/09), todos
  abaixo do ticket de R$ 67,00 — de R$ 13,08 a R$ 64,24. Seis têm de 3 a 6
  vendas: validados, mas finos. Os grossos: `1748196816197370` (195),
  `3808761996084317` (75), `1948563059116317` (20), `1072883335174332` (15).

**Ressalva:** CPA não viaja com o criativo. Onze dos doze vêm de outro destino, e
o desafio2 é o pior dos cinco no clique→venda (9,9% contra 24,9% do Desbloqueio).
A campanha testa criativo validado, não o destino. A de 17/09
(`120250507911370459`) segue PAUSADA com R$ 0,00 — foi montada com o ranking
antigo, o da compra reportada pela Meta por destino.

**Pendência:** a campanha `120250507792940459` (mesma coisa em ABO) foi criada
por engano meu antes desta e segue PAUSADA com R$ 0,00 gasto. Precisa ser
apagada assim que o dono confirmar.

**84% do gasto de 12 meses (R$ 274.113 de R$ 324.861) foi para destino sem quiz
cadastrado** — `quiz`, `quizz`, `capaquizz`, `quizmentem`, `quizcheckout`. Isso
não os torna cegos: a venda deles cai em `sales` com `quiz_id` NULO mas COM
`utm_content`, e 187 transações pagas da janela são desse grupo. Dá para validar
criativo ali por anúncio — o que não dá é ler o funil por etapa, que depende do
quiz cadastrado.

**Os cinco quizzes na mesma régua** (31/07-29/08; o front perde R$ 5.148,22):

| quiz | entra | form | clica | paga | ponta a ponta | gasto | CPA | margem |
|---|--:|--:|--:|--:|--:|--:|--:|--:|
| Bloqueios no Inconsciente | **57,2%** | **80,1%** | 27,0% | **28,5%** | **3,52%** | 5.968,46 | 67,82 | −424,76 |
| LP Oferta Mente Milionária | 60,6% | — | — | 39,6% | — | 7.067,10 | **61,99** | **+241,20** |
| Sessão de Desbloqueio | 42,9% | 72,0% | 26,4% | 24,9% | 2,03% | 16.757,02 | 83,79 | **−4.034,52** |
| Desafio Mente Milionária V2 | 48,4% | 54,0% | 66,2% | **9,9%** | 1,71% | 1.473,00 | 81,83 | −502,50 |
| Desafio Mente Milionária (V1) | 42,1% | 61,0% | 19,5% | 24,7% | 1,24% | 494,64 | 494,64 | −427,64 |

**O bloqueios2 é a versão melhor do Desbloqueio, e leva 1/3 da verba** — mesmo
checkout e ticket, 1,74x melhor ponta a ponta, vantagem quase toda da capa.
Aritmética das alavancas: Desbloqueio com a capa do bloqueios2 (42,9% → 57,2%)
vai a 280 vendas e margem +R$ 1.082,17; Desafio V2 pagando como o Desbloqueio
(9,9% → 24,9%) vai a 45 vendas e +R$ 970,55.

**A corrente fecha do clique pago à venda**, por eventos próprios (`lead`,
`buyclick`) que não estavam ligados à escada de `step_counts`:

| etapa | Desbloqueio | queda | Desafio V2 | queda |
|---|--:|--:|--:|--:|
| clique pago | 10.359 | — | 1.052 | — |
| começou o quiz | 4.441 | −57,1% | 509 | −51,6% |
| última pergunta | 3.664 | −17,5% | 333 | −34,6% |
| formulário enviado | 3.196 | −12,8% | 275 | −17,4% |
| entrou na oferta | 2.932 | −8,3% | 262 | −4,7% |
| clicou em comprar | 843 | **−71,2%** | 182 | −26,0% |
| venda paga | 210 | −75,1% | 18 | −90,1% |
| **clique → venda** | **2,0%** | | **1,7%** | |

A página de vendas do Desbloqueio é a segunda maior perda: 2.089 pessoas. Lead
R$ 5,61, clique em comprar R$ 22,95. Os problemas são opostos: o Desbloqueio
custa caro para arrancar o clique mas converte (24,9% paga); o V2 arranca o
clique fácil e quase ninguém paga (9,9%). O degrau 26 não é pergunta: é o
micro-compromisso da `renderSalesCommit()` — o quiz tem 25 perguntas.

**O funil completo EXISTE — noutro servidor, e falta a chave.** `renderStep()`
dispara `QuizStep` (`session_id`, `step_index`, `step_type`) para TODA tela e
manda a `quiz-analytics.iaplx.workers.dev/track`, que tem `/api/drop_off` pronta.
As rotas `/api/*` respondem 401 e o worker está na conta Cloudflare `iaplx` (a
nossa é `digizionpro`), fora do `CLOUDFLARE_API_TOKEN`. É o pedido mais barato
que existe para fechar o diagnóstico do funil.

**Checkout:** `desafio`/`desafio2` usam Assiny embutido, `bloqueio`/`bloqueios2`
redirect para a OnProfit — mas a venda paga dos CINCO chega ao dashboard pelo
mesmo webhook (`platform = assiny/webhook`), com UTM de anúncio. A divisão vale
para o que o MOTOR vê, não para o que é conferível.

**LP-DMM:** 114 vendas, CPA R$ 61,99 — o melhor dos cinco destinos. O MOTOR não
as vê; o dinheiro existe.

## Próximo passo

Na mão do dono: (1) ligar alguma campanha — a conta está com ZERO ativa;
(2) decidir se apaga a ABO `120250507792940459`, criada por engano; (3) a
predefinição de colunas do Gerenciador, único lugar onde "marcar só venda" ainda
não está feito e não tem endpoint de API.

Na minha: pôr a conferência por `utm_content` dentro do motor, por anúncio e por
criativo, em vez de estimar por destino — o CPA conferido da principal deu 32%
acima do que a Meta reporta. Antes disso, o passo 1 do briefing: carga horária de
gasto gravando `updated_at` e a conferência ao centavo contra o Gerenciador, que
apaga a primeira crítica da auditoria.
