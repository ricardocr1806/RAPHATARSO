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

## Próximo passo

O passo 1 do briefing, com credencial de verdade: carga horária de gasto,
gravando `updated_at`, e a conferência ao centavo contra o Gerenciador. É o
alicerce de todo o resto, e é o que apaga a primeira crítica da auditoria.
