# RAPHATARSO

Um método para pôr um agente a operar em produção — mexendo no que custa
dinheiro e no que é irreversível — sem perder a confiança de quem opera.

O domínio é trocável; a ordem das decisões, não.

Este repositório é o esqueleto do método: a parte que não depende de domínio já
está escrita e testada. O domínio ainda **não** foi ancorado — isso é a Fase 01,
e é a próxima coisa a acontecer.

## Por onde entrar

| Se você quer | Leia |
|---|---|
| Começar um agente destes do zero, em qualquer domínio | `docs/PROMPT-ABERTURA.md` |
| Saber a ordem das decisões e o que entregar em cada uma | `docs/FASES.md` |
| Entender as regras da relação e por que existem | `docs/DOUTRINA.md` |
| Não repetir erro caro que já foi pago | `ARMADILHAS.md` |
| Saber como está a operação agora | `ESTADO.md` |
| Trabalhar no código | `CLAUDE.md` |

## O que já roda

```
npm test           # 38 testes
npm run auditoria  # 5 verificações sobre o próprio repositório, resultado gravado
```

- `src/tempo.js` — fronteira de tempo: dia operacional no fuso de quem emite,
  data BR sem parser nativo, recusa de comparar janelas diferentes, dia corrente
  marcado como parcial.
- `src/doutrina.js` — 7 regras portáveis, puras, cada uma com o episódio que a
  gerou: divergência resolvida pela verdade, contagem por transação, promover
  exige volume / cortar exige tempo, estados que não compartilham nome,
  expiração de proposta, execução automática como lista fechada, número não
  conferido não sai.
- `src/readback.js` — escrita lida de volta no mesmo campo, com segunda chance
  para atraso de leitura-após-escrita, e `leitura_vazia` distinta de
  `divergencia`.
- `src/lote.js` — blocos abaixo do teto silencioso, orçamento de chamadas,
  segunda etapa que não derruba a primeira, conclusão só com tudo processado.
- `src/auditoria.js` — exceção é achado, verificação sem número é achado,
  auditoria não gravada é achado; batimento perde do dado.
- `scripts/auditoria.js` — a rota que audita este repositório, inclusive se o
  domínio ainda não foi ancorado.

## O que falta

A Fase 01: ancorar a verdade. As perguntas estão em `docs/FASES.md`. Enquanto
`config.verdade.fonte` for placeholder, `src/doutrina.js` não recebe nenhuma
regra de domínio e nenhuma automação é ligada.

## Duas coisas ditas em voz alta

**O que eu faria diferente se recomeçasse hoje.** Construiria a auditoria na
primeira semana, não no terceiro mês — todo defeito caro do sistema anterior foi
uma falha silenciosa que a auditoria teria pego em horas. E escreveria o arquivo
de armadilhas desde o primeiro dia; ele parece burocracia até a terceira vez que
você repete o mesmo erro.

**O que não daria certo sem quem opera.** As regras que mais economizaram
dinheiro não vieram de análise: vieram de alguém olhando a tela e dizendo "esse
número está errado". O agente mede e propõe rápido; quem sabe o que o número
significa no negócio é quem opera. Um sistema desses não substitui essa pessoa —
multiplica o alcance dela.
