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
- 40 armadilhas com preço; 15 delas com mutação que prova a trava.

## Achados na operação que está no ar (30/08/2026, conta CA3)

Conferido contra a Graph API e contra os bancos D1 `gestor`, `quiz-eventos` e
`dashboardquiz-db`. Janela fechada 31/07 a 29/08.

**Onde mora o dado do quiz da CA3:** `dashboardquiz-db`, não `quiz-eventos`.
Cinco quizzes (`quizzes.id` 5 a 9) cobrem cinco dos sete destinos dos anúncios;
`quizmentem` e `quizz` (R$ 1.010,07 na janela) não têm quiz cadastrado.

**Os números por quiz** (gasto Meta no fuso da conta; venda = TRANSAÇÃO paga,
convertida para São Paulo):

| quiz | gasto | vendas | CPA real | ticket | Meta diz |
|---|--:|--:|--:|--:|--:|
| Sessão de Desbloqueio | 16.757,02 | 200 | R$ 83,79 | R$ 63,61 | 238 |
| LP Oferta — Mente Milionária | 7.067,10 | 114 | R$ 61,99 | R$ 64,11 | 90 |
| Bloqueios no Inconsciente | 5.968,46 | 88 | R$ 67,82 | R$ 63,00 | 98 |
| Desafio Mente Milionária V2 | 1.473,00 | 18 | R$ 81,83 | R$ 53,92 | 18 |
| Desafio Mente Milionária | 494,64 | 1 | R$ 494,64 | R$ 67,00 | 1 |
| **total** | **31.760,22** | **421** | **R$ 75,44** | **R$ 63,21** | **445** |

Nenhum quiz tem CPA folgadamente abaixo do ticket: o front está no empate ou
abaixo dele, e o lucro da conta depende inteiramente do backend.

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
A queda da capa do V2 é 51,6% (não 67,8%) e a do Desbloqueio 57,2% (não 69,7%).
O bloqueios2 é o melhor nas duas medidas independentes: entrada e CPA.

**A escada de etapas não cobre o funil.** O contador só avança em
`QuizAnswer`: o Desafio V2 tem 54 telas e 34 degraus; o Desbloqueio, 33 telas e
26 degraus. As telas cegas são presente, prova, formulário, carregamento e
resultado — e é nelas que a perda mora. Reconstruído o fluxo a partir do código:
as quedas de 21,3% (formulário, depois de 32 perguntas), 6,7%, 6,4% e 5,6%
(pares presente+prova) não são de pergunta nenhuma; pergunta custa ~1%. Um
quarto par (Presente 4) derruba só 0,3% — mesmo desenho, dez vezes menos perda.
No Desbloqueio, os 71% entre a última pergunta (2.930) e o clique em comprar
(843) não têm degrau algum.

**Estado em 15/09 (dias fechados).** Uma campanha ativa,
`[67-CBO][Quiz normal-Bloqueio2] 11-08`, R$ 750/dia. Setembro até 15/09: gasto
R$ 9.100,09, 135 vendas, receita R$ 8.557,20, CPA R$ 67,41 × ticket R$ 63,39 —
margem **−R$ 542,89**. O mês tem duas metades opostas:

| | 05-11/09 (antes) | 14-15/09 (depois) |
|---|--:|--:|
| CPA | **R$ 59,97** | R$ 108,79 |
| custo por lead | R$ 5,14 | R$ 4,22 |
| lead → clique | 30,0% | 25,6% |
| clique → venda | **28,6%** | **15,2%** |
| margem no front | **+R$ 278,60** | **−R$ 501,44** |

**A conta ficou parada em 12-13/09** (R$ 111,70 e R$ 0) e a campanha foi
reativada em 14/09 às 09h08. A conta estava em `account_status=9` (carência) em
30/08, hoje está ATIVA, com saldo devedor de R$ 1.877,21.

O tráfego NÃO piorou: CTR subiu de 3,33% para 3,69%, CPM estável, frequência
1,38, posicionamentos idênticos, lead 18% mais barato. A quebra é toda depois do
clique. Descartados: checkout responde e não mudou de endereço nem de modo; a
mistura de pagamento é a de sempre (83% PIX), então não é venda por compensar.
Os dois destinos pioraram juntos (bloqueios2 R$ 59,75 → R$ 114,39; bloqueio
R$ 61,51 → R$ 80,75), então não é a página.

**A entrega trocou de criativo sozinha:** AD7 caiu de 74,0% para 19,9% da verba
e o AD3 subiu de 13,3% para 64,8%. Coincidência forte com o reinício, não
conclusão — a atribuição por anúncio segue morta.

**Veredito:** a regra R2D pediria REDUZIR, mas a **R09 vem antes e manda
MANTER** — a campanha tem menos de 48h desde a reativação, e os dois dias
fechados SÃO a janela de aprendizado. Não mexer antes de 17-18/09.

**A atribuição anúncio → venda segue morta** (2 vendas atribuídas à CA3 em 16
dias, contra 135 no dashboard). Toda leitura por anúncio é por DESTINO.

**Campanha de teste criada em 17/09 — PAUSADA, na CA3** (`act_894212022756623`).

- Campanha **`120250507911370459`** · `[67-CBO][4 VENCEDORES CONFERIDOS][TESTE CRIATIVO] 17-09`
- **CBO, R$ 300/dia na campanha**, LOWEST_COST_WITHOUT_CAP, OUTCOME_SALES, pixel
  1130253591753543 PURCHASE, otimização VALUE, atribuição 1 dia, BR 18-65
  Advantage+ — copiado da campanha de origem `120249850923970459`.
- 3 conjuntos `[Vencedores] — 01/02/03`, sem orçamento próprio (vem da campanha).
- 12 anúncios (4 criativos × 3 conjuntos), destino original preservado:
  AD7→bloqueios2, AD3→bloqueios2, AD5→lpdmm, AD1→bloqueio.
- Read-back conferido: tudo em `PAUSED`, gasto R$ 0,00.

Os 4 criativos são os únicos com venda paga CONFERIDA e volume:
`vid:2028685591117036` (R$ 63,77 · 197 compras), `vid:4440623302864341`
(R$ 68,25 · 62), `vid:2811585259228142` (R$ 78,29 · 71), `vid:1423943486214484`
(R$ 78,96 · 151). Falta o dono ligar.

**Pendência:** a campanha `120250507792940459` (mesma coisa em ABO) foi criada
por engano meu antes desta e segue PAUSADA com R$ 0,00 gasto. Precisa ser
apagada assim que o dono confirmar.

**Varredura de 12 meses**Varredura de 12 meses (17/09/2025 a 16/09/2026): os "vencedores" históricos
não são conferíveis.** R$ 319.383,35 de gasto, 841 anúncios, 106 criativos com
R$300+. Dos 20 melhores por CPA (R$ 33,27 a R$ 46,95), **nenhum** tem venda
verificável: rodaram em `quiz`, `quizz`, `capaquizz`, `quizmentem` e
`quizcheckout` — destinos sem quiz cadastrado em lugar nenhum — ou terminaram
antes de 17/07, quando o dashboard passou a existir.

**76% do gasto de 12 meses (R$ 219.407) foi para destino sem medição de venda.**
Só 22% do gasto dos criativos grandes caiu em destino medível.

O melhor deles, `vid:893754483319333` (desafio2, R$ 19.694,10, CPA-Meta
R$ 40,74), gastou R$ 121,08 depois de 17/07 e fez 1 venda — CPA R$ 114,23 no
único pedaço conferível. Amostra fina, mas aponta contra.

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

A página de vendas do Desbloqueio é a segunda maior perda do funil: 2.089
pessoas. Lead custa R$ 5,61, clique em comprar R$ 22,95 — a oferta multiplica o
custo por quatro. Os dois quizzes têm problemas opostos: o Desbloqueio custa
caro para arrancar o clique mas converte (24,9% de quem clica paga); o V2
arranca o clique fácil e quase ninguém paga (9,9%).

**Correção:** o degrau 26 do Desbloqueio NÃO é pergunta do quiz — é o
micro-compromisso dentro da `renderSalesCommit()`, depois do formulário. O
quiz tem 25 perguntas. Os −20% que atribuí a essa "pergunta" eram formulário
(−12,8%) mais entrada na oferta (−8,3%).

**O dado completo do funil EXISTE — noutro servidor.** As páginas mandam todo
evento para dois destinos. O dashboard (`dashboardquiz.raphatarso.com.br`, banco
`dashboardquiz-db`) só grava etapa em `QuizAnswer`, por isso as 20 telas cegas.
Mas `renderStep()` dispara `QuizStep` com `session_id`, `step_index` e
`step_type` para TODA tela — pergunta, presente, prova, formulário, carregamento
e resultado — e manda para `quiz-analytics.iaplx.workers.dev/track`. Lá está o
funil por pessoa, por tela, datado, com a rota `/api/drop_off` pronta.

Não consigo ler: as rotas `/api/*` respondem 401 e o worker está em OUTRA conta
Cloudflare (`iaplx`; a nossa é `digizionpro`), fora do alcance do
`CLOUDFLARE_API_TOKEN`. Falta a chave de leitura — é o pedido mais barato que
existe para fechar o diagnóstico do funil.

**Checkout:** `desafio`/`desafio2` usam Assiny embutido; `bloqueio`/`bloqueios2`
usam redirect para a OnProfit. É exatamente a divisão entre os quizzes cujas
vendas o motor NÃO vê e os que ele vê.

**Correções de números que reportei antes:** eu disse que a LP-DMM tinha
gastado R$ 7.067,10 com zero venda. A venda existe — 114, CPA R$ 61,99, o melhor
dos cinco. O que era verdade é que o MOTOR não a vê. A comparação anterior
cruzou dia em UTC (`gestor.orders`) com dia no fuso da conta (Meta): os dois
bancos gravam UTC, e essa era a comparação de janelas que a doutrina proíbe. E a
queda de capa que publiquei usava um contador inflado como denominador.

## Próximo passo

O passo 1 do briefing, com credencial de verdade: carga horária de gasto,
gravando `updated_at`, e a conferência ao centavo contra o Gerenciador. É o
alicerce de todo o resto, e é o que apaga a primeira crítica da auditoria.
