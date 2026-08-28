# Como trabalhar neste repositório

Leia, nesta ordem, antes de qualquer coisa: `docs/DOUTRINA.md` (as regras da
relação), `ARMADILHAS.md` (o que já custou caro) e `ESTADO.md` (como está a
operação agora).

## As regras, em uma linha cada

1. **Verdade.** A fonte da verdade é o registro que ninguém tem interesse em
   inflar. Divergência se RESOLVE; nunca se tira média nem se arredonda.
2. **Doutrina em código.** Toda regra vira função pura e testada em
   `src/doutrina.js`, com o episódio que a gerou no comentário. Limiares em
   `config.json`, nunca no meio da lógica.
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

## Comandos

```
npm test           # 38 testes, sem dependências externas
npm run auditoria  # audita o próprio repositório; grava .auditoria/ultima.json
```

## Mensagem de commit

Conta o PORQUÊ, não o quê. O diff já diz o quê. Se a mudança veio de um erro
que custou caro, a mensagem cita o número e a armadilha correspondente.

## O que NÃO fazer

- Não escrever regra de domínio antes da Fase 01 estar fechada
  (`docs/FASES.md`). Enquanto `config.verdade.fonte` for placeholder, nenhum
  número deste sistema decide nada.
- Não ligar gatilho automático antes de existir a medição que o justifique.
- Não transformar `ESTADO.md` em diário.
