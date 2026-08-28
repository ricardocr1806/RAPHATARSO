# Armadilhas, com o preço de cada uma

Erro sem número vira folclore e alguém repete. Toda armadilha aqui carrega o
que custou.

As 19 abaixo vieram de outro domínio (um agente de tráfego que operava verba
real) e são **portáveis**: nenhuma delas é sobre anúncios. Chegaram prontas,
com o preço já pago lá. As próximas vêm daqui.

**Formato obrigatório de uma armadilha nova**, quatro campos e um título:

- título `###` — o que *parecia* estar certo;
- `**Preço:**` — o número que custou (vendas, horas, itens, reais, %). Sem número, não entra;
- `**Sintoma:**` — como apareceu do lado de fora;
- `**Causa:**` — o mecanismo;
- `**Trava:**` — a função e o teste que impedem a repetição, ou "sem trava" e por quê.

O objetivo declarado: que esta lista pare de crescer por descoberta e passe a
crescer por antecipação.

---

## Fronteira de tempo

### Cortar o dia no fuso errado
**Preço:** 21 vendas lidas como 8 — 62% do dia desaparecendo, sem erro nenhum em lugar nenhum.
**Sintoma:** o dia parecia fraco de manhã e "se corrigia" depois.
**Causa:** corte em UTC jogava tudo de 21h-24h para o dia seguinte.
**Trava:** `src/tempo.js#diaOperacional` + teste do instante de 23h30.

### Comparar uma janela com outra
**Preço:** toda razão custo/resultado do período, silenciosamente errada.
**Sintoma:** métrica plausível, irreproduzível na mão.
**Causa:** custo vinha num fuso, receita em outro.
**Trava:** `src/tempo.js#exigirMesmaJanela` — recusa a comparação em vez de fazê-la.

### Data brasileira lida como mês-dia
**Preço:** `null` para todo dia > 12 — o bug some nos 12 primeiros dias de cada mês e volta no 13.
**Sintoma:** buracos periódicos nos relatórios.
**Causa:** `new Date('13/08/2026')` é Invalid Date.
**Trava:** `src/tempo.js#parseDataBR` — parser explícito, nunca o nativo.

### Decidir sobre o dia corrente
**Preço:** 42% dos pagamentos do dia ainda por compensar — todo custo recente lê mais caro do que vai terminar.
**Sintoma:** cortes tomados de manhã que pareciam errados à noite.
**Causa:** janela aberta tratada como janela fechada.
**Trava:** `src/tempo.js#classificarJanela` + `decidir({janelaDecidivel:false})`.

## Contagem e verdade

### Confiar no painel de quem tem interesse no número
**Preço:** inflação de 1,6x a 3,5x, e o pedido contado na geração em vez de no pagamento.
**Sintoma:** o painel sempre um pouco mais generoso que o extrato.
**Causa:** atribuição da plataforma é marketing, não contabilidade.
**Trava:** `src/doutrina.js#resolverDivergencia` — a verdade decide, a divergência é declarada, nunca se tira média.

### Agrupar por pedido em vez de por transação
**Preço:** +11% a +20% de receita que não existiu (cada order bump virando venda nova).
**Sintoma:** total plausível, sobrevive a revisão.
**Causa:** chave de contagem errada.
**Trava:** `src/doutrina.js#contarUnicos` com chave de transação.

### Amostra pequena que protege um lado só
**Preço:** um caso de 14 dias e 1 resultado ficou gastando, escondido pela régua de "menos de 3 = sem dado".
**Sintoma:** nada nunca era cortado.
**Causa:** o mesmo limiar servindo para promover e para cortar.
**Trava:** `src/doutrina.js#decidir` — promover exige VOLUME, cortar exige TEMPO.

### Entregar estimativa com cara de medição
**Preço:** indistinguível de medição 24h depois; qualquer decisão em cima herda o erro.
**Sintoma:** número redondo demais.
**Causa:** não deu para conferir e ninguém disse isso.
**Trava:** `src/doutrina.js#apresentarNumero` — sem conferência, o campo vai vazio com o motivo.

## Escrita e leitura

### Read-back que nunca leu nada
**Preço:** meses com a ação mais perigosa do sistema sendo a única sem prova.
**Sintoma:** "a leitura falhou" aparecia em TODA pausa — e por aparecer sempre, ninguém olhava.
**Causa:** o campo lido não existia na resposta; ausência tratada como divergência.
**Trava:** `src/readback.js` — `leitura_vazia` é motivo distinto de `divergencia`.

### Uma leitura só, com atraso de leitura-após-escrita
**Preço:** de 6 objetos pausados, 1 alarme falso — e alarme falso ensina a ignorar o alarme.
**Sintoma:** o objeto voltava ATIVO na primeira leitura e PAUSADO 3s depois.
**Causa:** consistência eventual.
**Trava:** segunda tentativa antes de declarar divergência.

### Alarme que toca sempre / sucesso vestido de erro
**Preço:** o dono reaprovou a mesma coisa três vezes em quatro horas — a trava funcionava e era gravada como "falhou".
**Sintoma:** ação repetida por quem confiava na mensagem.
**Causa:** estado de sucesso mapeado para o texto de erro.
**Trava:** nomes de estado distintos e testados (ver abaixo).

## Lote, limite e conclusão

### Pedir um campo a mais numa leitura em lote
**Preço:** de 11 de 11 para 0 de 11. Campo que o objeto não tem não é ignorado: é RECUSADO, e derruba a requisição inteira.
**Sintoma:** a leitura "parou de funcionar" sem mudança aparente.
**Causa:** um campo válido para um tipo de objeto, inválido para outro.
**Trava:** `src/lote.js#lerEmEtapas` — a segunda etapa não pode derrubar a primeira.

### Teto silencioso de parâmetros e de chamadas
**Preço:** 200 marcadores devolvendo zero linha SEM ERRO; e 152 itens parando em 15 no teto de 1.000 chamadas externas por invocação.
**Sintoma:** "não há nada" em vez de "não consegui ler".
**Causa:** limites do banco e do ambiente que falham por omissão.
**Trava:** `src/lote.js#emBlocos` (90) e `#criarOrcamento`; `avaliarContagem` trata zero linha como achado.

### Marca de concluída sem ter acabado
**Preço:** 15 de 152 itens processados, com o registro dizendo "concluída" — os outros 137 ficariam de fora para sempre.
**Sintoma:** nenhum. É esse o problema.
**Causa:** conclusão marcada por ter rodado, não por ter terminado.
**Trava:** `src/lote.js#marcarConclusao` — só `concluida` com `processados === total` e zero falhas.

## Nomes, deploy e entrega

### Duas coisas diferentes com o mesmo nome
**Preço:** a fila reapresentava o que o dono já tinha negado e engolia o que o sistema ia reapresentar.
**Sintoma:** decisões "voltando do além".
**Causa:** "recusada" significando "o dono disse não" e "o sistema barrou" — reações opostas.
**Trava:** `ESTADOS_DE_PROPOSTA` — `negada_pelo_dono` é terminal, `barrada_pelo_sistema` não é.

### Commit no repositório tratado como código no ar
**Preço:** uma trava entrou no arquivo e no dia seguinte a varredura achou 2 objetos violando ela.
**Sintoma:** a regra nova "não funciona".
**Causa:** o processo no ar era mais velho que o commit. Commit sem deploy é uma mentira com data.
**Trava:** `src/auditoria.js#verificarVersaoNoAr` + `VERSAO_NO_AR` na rota de auditoria.

### Batimento verde com a fonte parada
**Preço:** 10h de fonte fora do ar; 4h de tabela de gasto congelada no pico, com a etapa "rodando" e voltando zero linha.
**Sintoma:** todos os verdes acesos.
**Causa:** batimento é o que o sistema DIZ de si; dado é o que ele FEZ.
**Trava:** `src/auditoria.js#compararBatimentoComDado` — quando discordam, quem tem razão é o dado.

### Bloco de auditoria com catch que engole exceção
**Preço:** incalculável — é o defeito que esconde todos os outros: vira "nenhum problema encontrado".
**Sintoma:** auditoria sempre limpa.
**Causa:** try/catch silencioso.
**Trava:** `src/auditoria.js#rodarAuditoria` — exceção É achado; verificação sem número É achado; auditoria não gravada É achado.

### Link que não abre para quem recebe
**Preço:** 3 formatos enviados antes de um abrir — o certo estava disponível desde o começo, num campo que ninguém tinha ido buscar.
**Sintoma:** "não consigo ver".
**Causa:** link é entrega; se não abre para o destinatário, não foi entregue.
**Trava:** sem trava automática ainda — conferir o campo de link público na fonte antes de enviar.
