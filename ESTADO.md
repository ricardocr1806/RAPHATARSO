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
- 53 armadilhas com preço; 15 delas com mutação que prova a trava.

**Conta CA3 em 27/09/2026, 21:00 -0300:** **zero campanhas ativas.** Todas as 8
estão PAUSED, incluindo a `[67-CBO][Quiz normal-Bloqueio2] 11-08` (R$ 750/dia) e
as duas que eu criei em 17/09 — a CBO `120250507911370459` (R$ 300/dia) e a ABO
`120250507792940459`, que foi erro meu e continua aguardando decisão de excluir.

Últimos 7 dias fechados (20-26/09), campanha principal: gasto R$ 5.249,92,
**104 compras**, CPA Meta **R$ 50,48**, receita Meta R$ 6.968,00, ROAS 1,33.
Ticket R$ 63,36. **Esse CPA NÃO foi conferido contra venda paga nesta janela** —
o fator medido para esse destino era 0,87x, o que pôria o CPA real perto de
R$ 58; enquanto a conferência não é feita, o número da Meta não decide nada
(regra 5).

## Achados na operação que está no ar (conta CA3)

Conferido contra a Graph API e os bancos D1 `gestor`, `quiz-eventos` e
`dashboardquiz-db`. **Onde mora o dado do quiz da CA3:** `dashboardquiz-db`, não
`quiz-eventos`. Cinco quizzes (`quizzes.id` 5 a 9) cobrem cinco dos sete destinos
dos anúncios; `quizmentem` e `quizz` (R$ 1.010,07 na janela) não têm quiz
cadastrado.

**O quanto a Meta erra, por destino** (janela 31/07-29/08; venda = TRANSAÇÃO
paga). A Meta disse 445 no total contra 421 conferidas, mas o erro não é
uniforme e por isso não se tira média: Desbloqueio 238 ditas × 200 reais
(0,84x), Bloqueios 98 × 88 (0,90x), LP-DMM 90 × 114 (**1,27x**, a Meta vê
MENOS), Desafio V2 e V1 exatos. Gasto R$ 31.760,22, CPA real R$ 75,44 contra
ticket R$ 63,21 — nenhum quiz tem CPA folgadamente abaixo do ticket: o front
está no empate ou abaixo, e o lucro depende inteiramente do backend.

**A CA3 continua fora da carga de gasto** (`gestor.spend` cobre 4 contas, não
esta), e o motor é cego para a maior parte da venda: das 421 vendas pagas,
**181 não existem em `gestor.orders` sob nenhuma conta nem status**. O checkout
é Assiny, que alimenta só o dashboard. O motor enxerga 222.

**Defeitos do próprio dashboard, medidos:**
- `quizzes.purchase` = 0 nos cinco, com 896 linhas pagas em `sales`. Zero é uma
  afirmação, e esta é falsa.
- 250 transações têm uma segunda linha paga exatamente 7 dias depois, mesmo
  valor: reentrega. Contar LINHA em vez de transação inflaria a LP-DMM em 98%
  e o Desafio Mente Milionária em 1.300%.
- `sales.amount` não inclui o order bump (`order_bumps` no payload cru, 19
  transações na janela). A receita acima é PISO.
- 174 linhas sem `txn_id`, todas não pagas.

**A capa: o contador de entrada infla.** `entry` dispara no `PageView` em
`bloqueio`, `bloqueios2` e `desafio2` — antes de qualquer pixel na tela, contando
recarga, prefetch e robô. Medido contra o clique pago da Meta, ele infla de 41%
a 54%. Já `desafio` (V1) só conta na primeira interação real. Comparar os dois é
comparar definições, não capas — duas coisas diferentes com o mesmo nome.

Com o denominador honesto (cliques no link), quem chega e responde a primeira
pergunta: bloqueios2 56,5% · desafio2 48,4% · bloqueio 42,8% · desafio V1 42,1%.
O bloqueios2 é o melhor nas duas medidas independentes: entrada e CPA.

**A escada de etapas não cobre o funil.** O contador só avança em
`QuizAnswer`: o Desafio V2 tem 54 telas e 34 degraus; o Desbloqueio, 33 telas e
26 degraus. As telas cegas — presente, prova, formulário, carregamento,
resultado — são onde a perda mora: 21,3% no formulário e 6,7%/6,4%/5,6% nos
pares presente+prova, contra ~1% por pergunta. Um quarto par (Presente 4)
derruba só 0,3%: mesmo desenho, dez vezes menos perda. No Desbloqueio, os 71%
entre a última pergunta (2.930) e o clique em comprar (843) não têm degrau.

**PIXEL LIMPO (corrigido em 27/09).** As páginas `bloqueio` e `bloqueios2`
mandavam toda ação do lead para o pixel `4856275891285933`: 208.679 eventos em
8 dias, 43% `QuizAnswer` e 18% `ViewContent`, venda em 0,4%. Cada visitante
gerava ~25 eventos de pixel antes de qualquer ação comercial.

A causa era o `track()` reenviar toda chamada ao `fbq`. Trocado por allowlist
`['Purchase']`, sem `trackCustom` — e como quem dispara `Purchase` é o checkout,
as páginas passaram a mandar ZERO evento ao pixel. Só o ramo do `fbq` mudou: as 17
chamadas de `track()`, o analytics interno e o dashboard (incluindo `buyclick`)
seguem intactos.

Conferido em Chromium, 6 telas percorridas: versão antiga 8 chamadas ao pixel
(init, PageView, QuizStart, QuizAnswer ×5); versão no ar, 1 (só `init`).

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

O pedido "quero que o Gerenciador puxe pra marcar somente vendas" já está
satisfeito na configuração da conta, e estava antes de qualquer mudança de
página. Os **200 conjuntos** da conta apontam todos para o mesmo evento de
resultado:

| conjuntos | pixel | evento contado | otimização |
|--:|---|---|---|
| 113 | `1130253591753543` | PURCHASE | OFFSITE_CONVERSIONS |
| 87 | `1130253591753543` | PURCHASE | VALUE |

Nenhum conjunto otimiza lead, clique ou engajamento. E o pixel `1130` recebe
evento de apenas duas origens — `pay.onprofit.com.br` (466 em 2 dias) e
`chatt.raphatarso.com.br` (3). Nenhuma página de quiz o polui.

Confere contra o dado bruto: `Purchase` no pixel `1130` em 7 dias = **107**;
compras reportadas pela campanha no mesmo período = **104**. Consistente.

**O que faz aparecer engajamento, vídeo e clique na tela é a PREDEFINIÇÃO DE
COLUNAS**, não o que a conta conta como resultado. A API sempre devolve ~60
`action_type` (page_engagement 73.248, video_view 67.102, initiate_checkout 399…)
e a interface mostra os que a predefinição pedir. Isso é ajuste de visualização
por usuário: **não existe endpoint na Marketing API para predefinição de
colunas** — só se muda na interface (Colunas → Personalizar colunas → salvar como
predefinição). Por isso essa parte não é executável por aqui.

**Financeiro:** estava em `account_status=9` (carência) em 30/08; hoje ATIVA, com saldo devedor de R$ 1.877,21.

**A atribuição anúncio → venda segue morta** (2 vendas atribuídas à CA3 em 16
dias, contra 135 no dashboard). Toda leitura por anúncio é por DESTINO.

**Campanha de teste criada em 17/09 — PAUSADA, na CA3** (`act_894212022756623`).

- Campanha **`120250507911370459`** · `[67-CBO][4 VENCEDORES CONFERIDOS][TESTE CRIATIVO] 17-09`
- **CBO, R$ 300/dia na campanha**, OUTCOME_SALES, pixel 1130253591753543
  PURCHASE, otimização VALUE, atribuição 1 dia — copiado de `120249850923970459`.
- 3 conjuntos sem orçamento próprio; 12 anúncios (4 criativos × 3), destino
  original preservado: AD7→bloqueios2, AD3→bloqueios2, AD5→lpdmm, AD1→bloqueio.
- Os 4 criativos são os únicos com venda paga CONFERIDA e volume:
  `vid:2028685591117036` (R$ 63,77 · 197 compras), `vid:4440623302864341`
  (R$ 68,25 · 62), `vid:2811585259228142` (R$ 78,29 · 71),
  `vid:1423943486214484` (R$ 78,96 · 151).
- Read-back conferido: tudo em `PAUSED`, gasto R$ 0,00. Falta o dono ligar.

**Pendência:** a campanha `120250507792940459` (mesma coisa em ABO) foi criada
por engano meu antes desta e segue PAUSADA com R$ 0,00 gasto. Precisa ser
apagada assim que o dono confirmar.

**76% do gasto de 12 meses (R$ 219.407) foi para destino sem medição de venda.**
Varredura 17/09/2025 a 16/09/2026: os 20 melhores criativos da conta por CPA
(R$ 33,27 a R$ 46,95) rodaram todos em `quiz`, `quizz`, `capaquizz`, `quizmentem`
e `quizcheckout` — destinos sem venda medida — ou são de antes de 17/07. Montar
campanha com eles é escalar número nunca conferido contra venda paga. Por isso a
campanha de 17/09 usou só criativo com venda conferida.

**Os cinco quizzes na mesma régua** (funil acumulado; dinheiro na janela
fechada 31/07-29/08). O front da conta perde R$ 5.148,22 no período:

| quiz | entra | form | clica | paga | ponta a ponta | gasto | CPA | margem |
|---|--:|--:|--:|--:|--:|--:|--:|--:|
| Bloqueios no Inconsciente | **57,2%** | **80,1%** | 27,0% | **28,5%** | **3,52%** | 5.968,46 | 67,82 | −424,76 |
| LP Oferta Mente Milionária | 60,6% | — | — | 39,6% | — | 7.067,10 | **61,99** | **+241,20** |
| Sessão de Desbloqueio | 42,9% | 72,0% | 26,4% | 24,9% | 2,03% | 16.757,02 | 83,79 | **−4.034,52** |
| Desafio Mente Milionária V2 | 48,4% | 54,0% | 66,2% | **9,9%** | 1,71% | 1.473,00 | 81,83 | −502,50 |
| Desafio Mente Milionária (V1) | 42,1% | 61,0% | 19,5% | 24,7% | 1,24% | 494,64 | 494,64 | −427,64 |

**O bloqueios2 é a versão melhor do Desbloqueio, e leva 1/3 da verba.** Mesmo
checkout (OnProfit `Du1vhEUc?off=XOSnjX`), mesmo ticket (R$ 63,00 × R$ 63,61) e
1,74x melhor ponta a ponta. A vantagem vem quase toda da capa: 1,33x na entrada,
1,11x no formulário, 1,02x no clique, 1,14x no pagamento.

Aritmética das duas alavancas, tudo o mais constante:
- Desbloqueio com a capa do bloqueios2 (42,9% → 57,2%): 200 → 280 vendas, CPA
  R$ 83,79 → R$ 59,75, margem −R$ 4.034,52 → **+R$ 1.082,17**.
- Desafio V2 pagando como o Desbloqueio (9,9% → 24,9%): 18 → 45 vendas, CPA
  R$ 81,83 → R$ 32,50, margem −R$ 502,50 → **+R$ 970,55**.

**A corrente fecha do clique pago à venda.** O formulário e a página de vendas
não eram cegos: são medidos por eventos próprios (`lead` = formulário enviado,
`buyclick`), que não estavam ligados à escada de `step_counts`. Acumulado:

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
`renderSalesCommit()`, depois do formulário. O quiz tem 25 perguntas.

**O funil completo EXISTE — noutro servidor, e falta a chave.** `renderStep()`
dispara `QuizStep` (`session_id`, `step_index`, `step_type`) para TODA tela e
manda a `quiz-analytics.iaplx.workers.dev/track`, que tem `/api/drop_off` pronta.
As rotas `/api/*` respondem 401 e o worker está na conta Cloudflare `iaplx` (a
nossa é `digizionpro`), fora do `CLOUDFLARE_API_TOKEN`. É o pedido mais barato
que existe para fechar o diagnóstico do funil.

**Checkout:** `desafio`/`desafio2` usam Assiny embutido; `bloqueio`/`bloqueios2`
usam redirect para a OnProfit. É exatamente a divisão entre os quizzes cujas
vendas o motor NÃO vê e os que ele vê.

**LP-DMM:** 114 vendas, CPA R$ 61,99 — o melhor dos cinco destinos. O MOTOR não
as vê; o dinheiro existe.

## Próximo passo

Na mão do dono, nesta ordem: (1) decidir se apaga a campanha ABO
`120250507792940459`, criada por engano; (2) ligar a CBO `120250507911370459` —
a conta está com ZERO campanha ativa; (3) a predefinição de colunas do
Gerenciador, que é o único lugar onde "marcar só venda" ainda não está feito e
não tem endpoint de API.

Na minha: o passo 1 do briefing com credencial de verdade — carga horária de
gasto gravando `updated_at`, e a conferência ao centavo contra o Gerenciador. É o
alicerce de todo o resto e apaga a primeira crítica da auditoria.
