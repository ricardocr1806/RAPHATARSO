# Estado

> Este arquivo é **reescrito** ao fim de cada trabalho. Não é diário: responde
> "como está a operação agora". O histórico mora nos commits — e as mensagens
> de commit contam o PORQUÊ, não o quê.
>
> Limite prático: 300 linhas. A auditoria avisa quando passa disso. (Lá, este
> arquivo chegou a 614 linhas de diário e voltou para 280 de estado; diário faz
> cada sessão pagar o contexto de tudo que já passou.)

**Atualizado em:** 2026-08-28
**Fase atual:** 01 — ancorar a verdade (bloqueada: falta o domínio)

## Em uma linha

O esqueleto do método está no ar e testado; o domínio ainda não foi ancorado,
então nada aqui decide nada ainda.

## O que existe

| Peça | Arquivo | Estado |
|---|---|---|
| Fronteira de tempo | `src/tempo.js` | pronta, 5 testes |
| Doutrina (7 regras portáveis) | `src/doutrina.js` | pronta, 14 testes |
| Read-back com segunda chance | `src/readback.js` | pronto, 5 testes |
| Lote, teto e conclusão | `src/lote.js` | pronto, 6 testes |
| Auditoria que audita a si mesma | `src/auditoria.js` | pronta, 8 testes |
| Rota de auditoria | `scripts/auditoria.js` | roda; audita o próprio repositório |
| Armadilhas com preço | `ARMADILHAS.md` | 19, todas com número |

`npm test` → 38 testes. `npm run auditoria` → 5 verificações, resultado gravado
em `.auditoria/ultima.json`.

## O que está travado, e no quê

- **Fase 01 (ancorar a verdade).** Falta a resposta a uma pergunta: qual é o
  registro que ninguém tem interesse em inflar, neste domínio? Enquanto
  `config.verdade.fonte` for placeholder, a auditoria acusa `atencao` e nenhuma
  automação deve ser ligada.
- **Fase 04 (execução automática).** `config.propostas.gatilhosComExecucaoAutomatica`
  está vazio de propósito. Só entra o que PARA de gastar por ausência de
  resultado, um gatilho por vez, depois de medido.

## Números que valem hoje

- 0 escritas em produção feitas por este sistema.
- 0 propostas na fila (a fila ainda não existe — entra na Fase 04).
- 19 armadilhas herdadas, 0 descobertas aqui.

## Próximo passo

Responder às perguntas da Fase 01 (`docs/FASES.md`) e preencher `config.json`.
Só então escrever a primeira regra de domínio em `src/doutrina.js`.
