# Armadilhas, com o preço de cada uma

Erro sem número vira folclore e alguém repete. Toda armadilha aqui carrega o que
custou.

**Formato obrigatório de uma armadilha nova**, quatro campos e um título:

- título `###` — o que *parecia* estar certo;
- `**Preço:**` — o número que custou (vendas, horas, itens, reais, %). Sem número, não entra;
- `**Sintoma:**` — como apareceu do lado de fora;
- `**Causa:**` — o mecanismo;
- `**Trava:**` — a função e o teste que impedem a repetição, ou "sem trava" e por quê.

O objetivo declarado: que esta lista pare de crescer por descoberta e passe a
crescer por antecipação.

`npm run mutacao` reintroduz 15 destes defeitos, um por vez, e exige que a suíte
fique VERMELHA. Armadilha cuja mutação passa verde não tem trava — tem só um
parágrafo.

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

## Meta / Graph API

### Pedir um campo que aquele nível não aceita
**Preço:** a requisição inteira recusada, não só o campo — a carga de gasto volta vazia e a tela lê "não gastou".
**Sintoma:** insights sumindo de um nível só.
**Causa:** `campaign_id` no nível de campanha; e `clicks` no lugar de `inline_link_clicks` infla o CTR com curtida e comentário.
**Trava:** `src/meta/campos.js#camposPara` (recusa o campo antes da Meta) e `#degradar` (tenta com menos campos em vez de desistir).

### `url_tags` enviado no anúncio
**Preço:** UTM ausente em toda a campanha — e com ela a ligação entre clique e venda.
**Sintoma:** `{"success":true}` e nada muda.
**Causa:** `url_tags` é campo do CRIATIVO. A Meta responde sucesso e ignora.
**Trava:** `src/meta/escrita.js#validarCriacao` + read-back no mesmo campo.

### `start_time` editado depois da criação
**Preço:** conjunto começa na hora em que nasceu, mesmo pausado — e o agendamento não acontece.
**Sintoma:** entrega começando fora da hora combinada.
**Causa:** a Meta só edita a hora de quem ainda não começou.
**Trava:** `validarCriacao` exige `start_time` na criação quando há agendamento.

### Criar campanha CBO com dois orçamentos
**Preço:** criação inteira derrubada, não só o campo.
**Sintoma:** erro genérico de validação.
**Causa:** orçamento diário junto com vitalício; e flags de criativo descontinuado copiadas de campanha antiga.
**Trava:** `validarCriacao`.

### Campanha nascendo ATIVA
**Preço:** seis campanhas de R$ 1.500/dia criadas por um deploy em propagação que ninguém pediu. Nasceram PAUSADAS — gasto zero. Ativas seriam R$ 9.000/dia.
**Sintoma:** nenhum, porque a trava segurou.
**Causa:** deploy em propagação servindo duas versões ao mesmo tempo.
**Trava:** `validarCriacao` recusa `status !== 'PAUSED'`.

### Rate limit na LEITURA lido como falha da escrita
**Preço:** objeto duplicado a cada reescrita — dinheiro entrando em campanha que ninguém criou de propósito.
**Sintoma:** `17: User request limit reached` logo depois de uma escrita que passou.
**Causa:** a mensagem parece dizer que nada aconteceu.
**Trava:** `src/meta/escrita.js#aplicarNaMeta` devolve `escrito_sem_conferir` e manda RELER — nunca reescrever.

### Ação de escrita atrás de um GET
**Preço:** cada prefetch de navegador e cada varredura de antivírus corporativo executa a ação. É dinheiro mudando de lugar sozinho.
**Sintoma:** ações "que ninguém clicou".
**Causa:** link é GET, e GET é clicado por robô.
**Trava:** `exigirPost`.

## Medição e comparação

### Comparar braços com tráfego de anúncios diferentes
**Preço:** uma variante "ganhava" de 66,7% a 39,1%; com tráfego do mesmo anúncio, 64,9% contra 52,0% — e as margens se cobriam. A decisão teria matado a variante certa.
**Sintoma:** teste A/B com resultado forte demais.
**Causa:** público de campanhas diferentes chamado de braço.
**Trava:** `src/funil.js#filtrarPorAnuncio` (exige `ad_id`) e `#compararBracos`.

### Ordenar por taxa com amostra pequena
**Preço:** 33% contra 29% com 20 pessoas por braço é sorteio — e a lista ordenada convida a matar o segundo colocado.
**Sintoma:** vencedores que trocam de lugar toda semana.
**Causa:** taxa sem intervalo de confiança.
**Trava:** `intervaloWilson` + veredito `empate_tecnico` escrito na tela.

### Medir a queda do funil contra a base
**Preço:** a tela culpada some no meio; toda tela do fim parece igualmente ruim. A queda real está no primeiro clique — de 32% a 85% da capa para a primeira pergunta, contra 0% a 4% por tela nas 40 seguintes.
**Sintoma:** otimização de tela do meio, onde não há perda.
**Causa:** denominador errado.
**Trava:** `quedaContraAnterior`.

### Bandit decidindo com três cliques
**Preço:** o braço vencedor eleito antes de existir amostra; o outro morre sem chance.
**Sintoma:** convergência instantânea.
**Causa:** Thompson Sampling sem aquecimento.
**Trava:** `src/bandit.js#escolherBraco` divide igual até 50 cliques por braço.

### Normalizar as fatias depois de aplicar o teto
**Preço:** ainda não custou — foi pego pelo teste antes de subir. O teto de 80% virava 94% numa disputa de dois braços.
**Sintoma:** o vencedor levando mais do que o teto declarado na tela.
**Causa:** normalizar depois de cortar desfaz o corte.
**Trava:** `fatiasComPisoETeto` fixa um tipo de violação por volta e redistribui o resto.

### `utm_campaign` usado para juntar campanha
**Preço:** junção silenciosamente errada — a etiqueta expandida da Meta chega mutilada no meio.
**Sintoma:** gasto sem campanha correspondente.
**Causa:** a UTM do clique vem cortada; o NOME vem inteiro pela API.
**Trava:** `spend.objeto_nome` no schema; junção por nome, nunca por UTM.

### Filtrar clique suspeito por país
**Preço:** cada clique de verdade recusado apaga a venda que ele traria. A automação de revisão da Meta chega dos EUA, com fbclid, em rajadas de 19 num minuto — e é indistinguível de um comprador viajando.
**Sintoma:** vendas sem clique de origem.
**Causa:** confundir "suspeito" com "robô".
**Trava:** `classificarClique` filtra user-agent conhecido e apenas MARCA o resto.

## Navegador

### Aviso enviado depois de um `await`
**Preço:** 14 leads gravados, 2 conversões registradas — 4 de cada 5 perdidas.
**Sintoma:** conversão muito menor que lead, sem erro no console.
**Causa:** a função não é aguardada e a linha seguinte é `location.href = ...`; o documento descarrega enquanto o await está em pé.
**Trava:** sem trava automática — `sendBeacon` com `text/plain` disparado ANTES de qualquer await (o preflight de `application/json` não é coberto por `keepalive`).

### Dois arquivos clássicos com o mesmo `const`
**Preço:** `SyntaxError` e NENHUM dos dois executa — a página inteira para.
**Sintoma:** tela em branco sem erro visível na aplicação.
**Causa:** script clássico divide escopo global.
**Trava:** código de página dentro de IIFE.

### `querySelector("#x").metodo()` sem `?.`
**Preço:** o que vem DEPOIS da linha que estourou não roda — e o sintoma aparece longe da causa.
**Sintoma:** metade da tela funcionando.
**Causa:** elemento removido em outra mudança.
**Trava:** encadeamento opcional em todo acesso a elemento.

## Processo e infraestrutura

### Worker chamando a URL pública de outro Worker da mesma conta
**Preço:** tela vazia dizendo "não consegui ler", com as duas pontas funcionando — horas de depuração no lugar errado.
**Sintoma:** 404 de um serviço que está no ar.
**Causa:** a requisição volta para o próprio chamador.
**Trava:** service binding (Worker→Worker interno), nunca URL pública.

### Deploy em propagação
**Preço:** seis campanhas de R$ 1.500/dia criadas por duas versões servindo ao mesmo tempo.
**Sintoma:** ação executada duas vezes, ou contra código velho.
**Causa:** propagação não é atômica.
**Trava:** ação que CRIA objeto não roda contra serviço recém-deployado; e campanha nasce pausada.

### Duas pessoas deployando o mesmo serviço de branches diferentes
**Preço:** o deploy de uma apaga o da outra — e o código no ar deixa de existir em qualquer branch.
**Sintoma:** regra que "voltou".
**Causa:** deploy sobrescreve, não faz merge.
**Trava:** `git pull` antes de subir; e `verificarVersaoNoAr` para saber o que está rodando.

### Segredo no repositório
**Preço:** o histórico do git guarda para sempre, inclusive em repositório privado — a rotação do token vira a única saída.
**Sintoma:** nenhum, até vazar.
**Causa:** conveniência.
**Trava:** cofre de secrets da plataforma; nada de token em arquivo versionado.

### Contador de entrada disparando no carregamento da página
**Preço:** a queda da capa apareceu como 69,7% quando era 57,2% — 1.483 pessoas que nunca existiram no funil do Desbloqueio, e um denominador que varia com robô e prefetch em todo teste de capa.
**Sintoma:** carregamentos 41% a 54% acima dos cliques que a Meta cobra.
**Causa:** `entry` disparado no `PageView`, antes de qualquer pixel na tela: conta recarga, volta do navegador, prefetch e rastreador.
**Trava:** sem trava automática — o denominador honesto é o clique pago da Meta; o código do quiz V1 (entrada só na primeira interação real) é o padrão a copiar.

### O mesmo nome para dois jeitos de contar entrada
**Preço:** levou a uma conclusão invertida — reportei que o quiz V1 tinha a melhor capa (77% de aproveitamento) quando ele tem a pior (42,1%), empatada com o Desbloqueio.
**Sintoma:** um funil aparentemente três vezes melhor que os irmãos, sem nada no desenho que explicasse.
**Causa:** `entries` significa "carregou a página" em três quizzes e "tocou na tela" em um. Dois estados diferentes com o mesmo nome.
**Trava:** `src/tempo.js#exigirMesmaJanela` é o análogo para tempo; para contador, a regra é a mesma — não comparar duas séries sem provar que medem o mesmo evento.

### Funil que só conta a tela onde a pessoa responde
**Preço:** 20 de 54 telas invisíveis no Desafio V2 e 7 de 33 no Desbloqueio — e as invisíveis são justamente onde a perda acontece: as quatro maiores quedas do V2 (21,3%, 6,7%, 6,4%, 5,6%) são todas em tela que não é pergunta. No Desbloqueio, os 71% perdidos entre a última pergunta e o clique em comprar não têm degrau nenhum.
**Sintoma:** uma escada limpa, com quedas de ~1% por tela, que não explica o resultado do funil.
**Causa:** o contador de etapa avança em `QuizAnswer`. Presente, prova, formulário, carregamento e resultado nunca disparam o evento.
**Trava:** sem trava automática — a escada só fecha quando o número de degraus bate com o número de telas do fluxo; conferir um contra o outro antes de concluir onde está o gargalo.
