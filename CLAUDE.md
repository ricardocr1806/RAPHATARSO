# Como trabalhar neste repositório

Leia, nesta ordem, antes de qualquer coisa: `docs/DOUTRINA.md` (as regras da
relação), `ARMADILHAS.md` (o que já custou caro) e `ESTADO.md` (como está a
operação agora).

## As regras, em uma linha cada

1. **Verdade.** A fonte da verdade é o registro que ninguém tem interesse em
   inflar. Divergência se RESOLVE; nunca se tira média nem se arredonda.
2. **Doutrina em código.** Regra de decisão vira dado em `src/regras.js` (o
   motor consulta, nunca há `if` de decisão solto); regra portável vira função
   pura em `src/doutrina.js`. Sempre com o episódio no comentário e o limiar em
   `config.json`.
3. **Propor, não executar.** Proponha e espere OK. Execução automática só para
   os gatilhos listados em `config.propostas.gatilhosComExecucaoAutomatica`, e
   nunca para nada que gaste.
4. **Read-back.** Toda escrita é lida de volta no mesmo campo. `leitura_vazia`
   nunca é sucesso.
5. **Número conferido.** Sem conferência contra o dado bruto, diga que não deu —
   não estime.
6. **Memória.** Reescreva `ESTADO.md` ao fim de cada trabalho. É estado, não
   diário; o histórico mora nos commits.
7. **Armadilhas com preço.** Todo erro caro vira linha em `ARMADILHAS.md` com o
   número que custou.
8. **Falha em silêncio é o inimigo.** Exceção é achado, verificação sem número é
   achado, auditoria não gravada é achado.

## Regras de código

- Nenhum teste reimplementa a lógica que testa — importe a função real. Cópia em
  teste envelhece calada e passa a aprovar o que o sistema já não faz.
- Nome de teste descreve o caso real ("14 dias e 1 resultado é corte"), não o
  caso abstrato ("deve retornar cortar").
- Nunca `new Date(string)` para interpretar data de entrada — use `src/tempo.js`.
- Nunca comparar duas janelas sem passar por `exigirMesmaJanela`.
- Consulta em lote sempre por `emBlocos`; escrita em massa sempre com orçamento.
- Conclusão só se marca com tudo processado (`marcarConclusao`).
- Dois estados diferentes nunca compartilham nome.
- Venda é o CHECKOUT, nunca o pedido. Denominador de custo é só o FRONT.
- O dia corrente não decide: 42% dos checkouts dele ainda estão pendentes.
- Escrita na Meta passa por `src/meta/escrita.js` — read-back no mesmo campo, e
  rate limit na leitura NUNCA vira reescrita.
- `LIKE` é proibido onde a caixa importa: use `GLOB` (`src/sql.js`).

## Comandos

```
npm test           # 111 testes, sem dependências externas
npm run mutacao    # reintroduz 15 defeitos reais; todos precisam ficar VERMELHOS
npm run auditoria  # audita o próprio repositório; grava .auditoria/ultima.json
```

Regra nova em `src/regras.js` ou `src/doutrina.js` entra com teste E com
mutação: se `npm run mutacao` não fica vermelho ao quebrá-la, o teste não prova
nada.

## Mensagem de commit

Conta o PORQUÊ, não o quê. O diff já diz o quê. Se a mudança veio de um erro
que custou caro, a mensagem cita o número e a armadilha correspondente.

## O que NÃO fazer

- Não propor com número que não foi conferido contra o dado bruto. As duas
  conferências pendentes estão em `ESTADO.md` e a auditoria as acusa.
- Não criar campanha ATIVA. Campanha nasce PAUSADA, sempre.
- Não ligar gatilho automático antes de existir a medição que o justifique.
- Não transformar `ESTADO.md` em diário.
