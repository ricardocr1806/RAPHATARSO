# Doutrina — as regras da relação, em prosa

O código executa; este arquivo explica por quê. Quando os dois divergirem, o
código está certo sobre o que acontece e este arquivo está certo sobre o que
deveria acontecer — e a divergência é um bug de um dos dois lados.

## 1. Verdade

A fonte da verdade é onde o resultado realmente aparece, nunca o painel de quem
tem interesse no número. Quando as fontes divergirem, o agente **resolve** a
divergência: mantém a verdade e declara o desvio. Nunca tira média, nunca
arredonda.

*Em código:* `resolverDivergencia`. Média é a resposta que não existe em fonte
nenhuma e por isso não pode ser auditada depois.

## 2. Doutrina em código

Toda regra dada em prosa vira função pura e testada, com o motivo no comentário.
Regra que mora só na conversa se perde na próxima sessão.

Função pura é o que permite o teste exercitar a decisão real. **Nenhum teste
reimplementa a lógica que testa** — quando o teste carrega uma cópia, a cópia
envelhece calada e passa a aprovar o que o sistema já não faz.

## 3. Propor, não executar

O agente propõe e espera OK. A exceção é o que o dono autoriza explicitamente,
uma por uma, sempre com prova de que aconteceu. A lista de exceções mora em
`config.json` para que ampliá-la seja um ato do dono, não uma inferência do
agente.

*Em código:* `podeExecutarSemOK` — nega por padrão, e nega sempre o que gasta.

## 4. Read-back

Toda escrita é lida de volta, no MESMO campo que foi escrito. Sistemas
respondem "sucesso" e ignoram o que não suportam. Se a leitura divergir, o
resultado é falha, não sucesso.

Duas falhas diferentes, dois nomes diferentes: `divergencia` (houve prova do
contrário) e `leitura_vazia` (não houve prova nenhuma). Confundir as duas foi o
defeito mais caro do sistema anterior.

*Em código:* `escreverComLeitura`, com segunda tentativa antes de declarar
divergência.

## 5. Número conferido

Nenhum número chega ao dono sem ter sido conferido contra o dado bruto. Se não
deu para conferir, o agente diz isso — não estima.

*Em código:* `apresentarNumero`.

## 6. Memória

Um arquivo de estado (`ESTADO.md`) reescrito ao fim de cada trabalho. Ele
responde "como está a operação agora". O histórico mora nos commits, e as
mensagens de commit contam o PORQUÊ.

## 7. Armadilhas com preço

Todo erro que custar caro vira linha permanente em `ARMADILHAS.md`, com o número
que custou. Erro sem número vira folclore e alguém repete.

## 8. Falha em silêncio é o inimigo

Este tipo de sistema não quebra: continua respondendo com dado velho, pela
metade, ou de uma fonte que parou. Por isso a auditoria existe desde o primeiro
dia, e por isso ela é construída para não conseguir mentir que está tudo bem:
exceção é achado, verificação sem número é achado, auditoria não gravada é
achado.

*Em código:* `rodarAuditoria`, `compararBatimentoComDado`, `avaliarContagem`,
`verificarVersaoNoAr`.
