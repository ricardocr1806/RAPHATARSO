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

| Peça | Arquivo | Testes |
|---|---|---|
| Fronteira de tempo e fusos | `src/tempo.js` | 5 |
| Doutrina portável (7 regras puras) | `src/doutrina.js` | 14 |
| Vendas: checkout, front/backend, pendentes | `src/vendas.js` | 13 |
| As 16 regras + a dos dois dias fechados, como dados | `src/regras.js` | — |
| O motor que consulta as regras | `src/decisao.js` | 15 |
| Campos da Graph API com degradação | `src/meta/campos.js` | 18 |
| Escrita na Meta com read-back e rate limit | `src/meta/escrita.js` | ↑ |
| Thompson Sampling com aquecimento, piso e teto | `src/bandit.js` | 13 |
| Funil por pessoa, com Wilson e empate técnico | `src/funil.js` | 10 |
| Blocos de 90 e GLOB no lugar de LIKE | `src/sql.js`, `src/lote.js` | 11 |
| Read-back com segunda chance | `src/readback.js` | 5 |
| Auditoria que não engole exceção | `src/auditoria.js` | 8 |
| Schema dos três bancos | `db/schema.sql` | — |

```
npm test      # 111 testes, sem dependências externas
npm run mutacao   # 15 defeitos reintroduzidos, todos precisam ficar VERMELHOS
npm run auditoria # 9 verificações, resultado gravado em .auditoria/ultima.json
```

## Vermelho agora, e por quê

A auditoria acusa **2 críticas**, as duas por conferência que não pode ser feita
de dentro do repositório:

1. `gasto_conferido_com_o_gerenciador` — ninguém comparou ainda o gasto de
   ontem de três campanhas com o Gerenciador de Anúncios, ao centavo.
   Grave em `.conferencias/gerenciador.json`.
2. `order_bump_conferido` — nenhuma compra de teste com bump foi feita para
   provar que vira UMA venda. Grave em `.conferencias/order-bump.json`.

Enquanto isso, pela regra 16 nenhum número daqui vira proposta.

E **1 de atenção**: `versao_no_ar` — não há processo no ar declarando versão.
Commit sem deploy é uma mentira com data.

## O que NÃO existe ainda

- Nenhum Worker, nenhum banco provisionado, nenhum cron. O núcleo é puro e
  espera adaptadores.
- Passo 1 (carga horária de gasto) e passo 2 (webhook de venda): a lógica está
  escrita e testada, falta a borda de rede e as credenciais.
- Passo 7 (link inteligente) e passo 8 (api do funil): mesmo estado.
- Passo 9 (as telas) e passo 4 (identidade): só o schema.
- `config.contas` tem uma entrada de exemplo, inativa. Sem conta preenchida o
  motor não decide nada para conta nenhuma.

## Números que valem hoje

- 0 escritas na Meta feitas por este sistema.
- 0 propostas na fila.
- 0 gatilhos com execução automática — a lista está vazia de propósito.
- 57 armadilhas com preço; 15 delas com mutação que prova a trava.

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

**Defeitos do próprio dashboard, medidos:** `quizzes.purchase` = 0 nos cinco com
896 linhas pagas em `sales` (zero é uma afirmação, e é falsa); 250 transações têm
segunda linha paga 7 dias depois, mesmo valor — reentrega, e contar LINHA
inflaria a LP-DMM em 98%; `sales.amount` não inclui order bump, então a receita é
PISO; 174 linhas sem `txn_id`, todas não pagas.

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
0,4%. O `track()` reenviava tudo ao `fbq`; trocado por allowlist `['Purchase']`,
e como quem dispara `Purchase` é o checkout, as páginas passaram a mandar ZERO
evento. Só o ramo do `fbq` mudou — analytics e dashboard intactos.

Read-back contra a própria Meta (`/{pixel}/stats?aggregation=url`), janela igual
antes e depois do deploy: `bloqueios2` saiu da lista de origens (era ~80/h,
19.050 em 2 dias) e `bloqueio` caiu a **1** em 40 minutos. Tabela completa,
versões e rollback em `docs/CORRECAO-PIXEL.md`.

O que resta no pixel `4856275891285933` NÃO é das nossas páginas: é
`feridas.valeriatarso.com` (outro site, mesmo pixel, nunca tocado) e o checkout
da OnProfit, onde não há controle por evento — só ligar/desligar o pixel por
oferta. Desligar lá derrubaria o `Purchase` junto, que é o resultado da conta —
então NÃO se desliga.

### O Gerenciador já conta somente venda (conferido 27/09/2026)

Já estava satisfeito na configuração da conta, antes de qualquer mudança de
página: os **200 conjuntos** apontam para o mesmo evento de resultado — 113 em
OFFSITE_CONVERSIONS e 87 em VALUE, todos PURCHASE no pixel `1130253591753543`.
Nenhum otimiza lead, clique ou engajamento, e esse pixel só recebe de
`pay.onprofit.com.br` e `chatt` — nenhuma página de quiz o polui. Confere contra
o bruto: `Purchase` no pixel em 7 dias = 107; compras reportadas pela campanha no
mesmo período = 104.

**O que faz aparecer engajamento, vídeo e clique na tela é a PREDEFINIÇÃO DE
COLUNAS**, não o que a conta conta. A API devolve sempre ~60 `action_type` e a
interface mostra os que a predefinição pedir. É ajuste de visualização por
usuário e **não tem endpoint na Marketing API** — só na interface (Colunas →
Personalizar colunas → salvar como predefinição). Não é executável por aqui.

**Financeiro:** estava em `account_status=9` (carência) em 30/08; hoje ATIVA, com saldo devedor de R$ 1.877,21.

### A atribuição anúncio → venda NÃO está morta (achado de 29/09/2026)

O que estava morto era `gestor.orders`. A venda paga chega ao `dashboardquiz-db`
com o anúncio dentro do payload: `sales.raw` traz
`utm_content = "<nome do anúncio>|<ad_id>"`, mais campanha e conjunto. Cobertura
conferida: **920 transações pagas distintas de 17/07 a 27/09, 100% com
`utm_content`**, 871 com `ad_id` numérico e 830 casando com anúncio da CA3. Vale
para Assiny e OnProfit — o webhook é o mesmo. Isso troca o padrão de leitura:
**criativo passa a ser avaliado por VENDA PAGA conferida, não pela compra que a
Meta reporta.** Para refazer: dedup por `txn_id` (250 reentregas de 7 dias
inflariam), janela de gasto igual à da venda, `amount` em CENTAVOS.

Reagrupando pela mídia real, **17 criativos têm 3 ou mais vendas pagas
conferidas** na janela 17/07-26/09. Os 12 melhores por CPA real ficam todos
abaixo do ticket de R$ 67,00 — de R$ 13,08 a R$ 64,24.

**Tudo isso só existe porque a UTM carrega `{{ad.id}}`.** Anúncio novo sem
`url_tags` completo volta a ser cego por criativo.

### Campanha criada em 29/09 — PAUSADA, na CA3 (`act_894212022756623`)

Pedido: criativos com bom resultado em venda, apontados para
`https://desafio2.raphatarso.com.br/`, em 1 campanha × 3 conjuntos × 4 criativos
DIFERENTES e validados por conjunto.

- Campanha **`120250683788910459`** · `[67-CBO][12 VALIDADOS POR VENDA PAGA][Desafio2] 29-09`
- CBO **R$ 300/dia**, OUTCOME_SALES, LOWEST_COST_WITHOUT_CAP.
- 3 conjuntos `[Validados] — 01/02/03`, sem orçamento próprio, otimização
  **OFFSITE_CONVERSIONS** (não VALUE: o desafio2 fez 18 vendas no melhor mês, e
  VALUE precisa de muito mais sinal), pixel 1130253591753543 PURCHASE,
  atribuição 1 dia de clique, BR 18-65.
- 12 anúncios, **12 criativos distintos, 12 mídias distintas**, todos com
  `url_tags` completo — read-back conferiu inclusive o `{{ad.id}}`, e tudo em
  `PAUSED` com gasto R$ 0,00. Serpentina por CPA real deixa os conjuntos
  comparáveis (CPA médio 39,57 / 41,25 / 43,17). **Falta o dono ligar.**

Os 12 são os melhores por CPA REAL (venda paga conferida, 17/07-26/09), todos
abaixo do ticket de R$ 67,00 do desafio2 — de R$ 13,08 a R$ 64,24. Seis têm de 3
a 6 vendas: validados, mas finos. Os grossos são `1748196816197370` (195),
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

**O bloqueios2 é a versão melhor do Desbloqueio, e leva 1/3 da verba.** Mesmo
checkout e mesmo ticket, 1,74x melhor ponta a ponta — vantagem quase toda da
capa (1,33x na entrada).

Aritmética das duas alavancas, tudo o mais constante: Desbloqueio com a capa do
bloqueios2 (42,9% → 57,2%) vai a 280 vendas, CPA R$ 59,75, margem +R$ 1.082,17;
Desafio V2 pagando como o Desbloqueio (9,9% → 24,9%) vai a 45 vendas, CPA
R$ 32,50, margem +R$ 970,55.

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
R$ 5,61, clique em comprar R$ 22,95 — a oferta multiplica o custo por quatro. Os
problemas são opostos: o Desbloqueio custa caro para arrancar o clique mas
converte (24,9% paga); o V2 arranca o clique fácil e quase ninguém paga (9,9%).
O degrau 26 do Desbloqueio não é pergunta: é o micro-compromisso da
`renderSalesCommit()`, depois do formulário — o quiz tem 25 perguntas.

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
