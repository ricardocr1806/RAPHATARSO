# Estado

> Reescrito ao fim de cada trabalho. Não é diário: responde "como está a
> operação agora". O histórico mora nos commits.

**Atualizado em:** 2026-08-28
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
