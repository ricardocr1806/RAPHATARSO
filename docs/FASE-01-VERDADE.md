# Fase 01 — a verdade, ancorada

> Fechada. `config.verdade.fonte` deixou de ser placeholder.

## A tese, em uma frase

O pixel da Meta conta pedido **GERADO**; o dinheiro entra no pedido **PAGO**.
Entre os dois há uma diferença medida de **1,59x a 3,5x** e uma taxa de
pagamento de **~0,68** (PIX expira, boleto não paga). Um sistema que otimiza
pelo número da Meta escala o que parece bom.

## As seis perguntas, respondidas

**1. Onde o resultado aparece de forma irreversível, e quem emite o registro?**
No webhook de venda PAGA da plataforma de pagamento (Hotmart, Kiwify, OnProfit,
Eduzz). Quem emite é a plataforma, não a Meta. A atribuição da Meta é painel
informativo: aparece na tela, nunca no denominador.

**2. Que fuso o emissor usa, e quando ele carimba?**
O fuso da plataforma que emite a venda — `config.tempo.fusoDaVerdade`. O carimbo
que vale é o do PAGAMENTO (`pago_em`), não o da geração. O gasto da Meta vem no
fuso da CONTA: se os dois diferirem, `conferirFusos` acusa e a auditoria cobra.
Nunca se divide um pelo outro sem isso.

**3. Qual é a chave única de um resultado?**
`checkout_id`. Não `pedido_id`: com order bump cada item vira um pedido com id
próprio, e contar por pedido inflou a venda em 11% a 20%.

**4. Quanto tempo até o registro ficar definitivo?**
Do dia corrente, **42%** dos checkouts ainda estão pendentes; de ontem, **10%**;
de anteontem, **5%**. Por isso o dia corrente nunca decide, e por isso cortar
exige que os dois dias fechados confirmem — inclusive no cenário em que todo
pendente paga.

**5. Que painel existe, quem o mantém, e em quanto diverge?**
O Gerenciador de Anúncios, mantido pela Meta, que também é quem cobra pelo
resultado que reporta. Divergência esperada: 1,59x a 3,5x. Dentro dessa faixa o
sistema classifica como `inflacao_conhecida_do_painel`; fora dela, como
`divergencia_inexplicada` — e divergência se RESOLVE, nunca se arredonda.

**6. O que é irreversível quando o agente escreve?**
Dinheiro. Subir orçamento gasta; pausar campanha boa perde entrega e joga a
campanha de volta no aprendizado; criar campanha ativa gasta sozinha. Por isso:
campanha nasce PAUSADA, escrita é POST, e nada executa sem OK — a lista de
gatilhos automáticos está vazia e só recebe o que PARA de gastar.

## O denominador

Custo por venda usa **somente vendas de FRONT pagas**. Contar backend barateia o
número sem uma venda de entrada a mais ter acontecido: R$ 40,44 no lugar de
R$ 54,22 — 26% mais barato — e o erro explode justo no dia em que o carrinho do
produto principal abre.

## O que esta fase NÃO fechou

Duas conferências que só quem tem as credenciais faz, e que a auditoria acusa
como críticas até serem gravadas:

1. **Gasto do sistema × Gerenciador**, ao centavo, em três campanhas →
   `.conferencias/gerenciador.json`
2. **Compra de teste com order bump vira UMA venda** →
   `.conferencias/order-bump.json`

Enquanto elas estiverem vermelhas, nenhum número deste sistema foi conferido
contra o dado bruto — e pela regra 16 ele não vira proposta.
