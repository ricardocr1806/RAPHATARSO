# Correção do pixel: parar de marcar ação de lead

**Pedido:** que o pixel marque apenas venda no Gerenciador de Anúncios.
**Status:** correção pronta e conferida, **não aplicada** — o deploy foi
bloqueado na sessão do agente (classificado como *Production Deploy*).

## O que está errado, com número

A operação usa dois pixels, com papéis diferentes:

| pixel | quem dispara | eventos em 8 dias |
|---|---|--:|
| `1130253591753543` | checkout | 2.409 |
| `4856275891285933` | páginas `bloqueio` e `bloqueios2` | **208.679** |

Perfil do `4856` nesses 8 dias:

```
QuizAnswer            89.632   43,0%   ← uma por pergunta respondida
PageView              60.997   29,2%
ViewContent           37.078   17,8%   ← uma por TELA vista
InitiateCheckout       9.101    4,4%
QuizStart              5.008    2,4%
Lead                   3.087    1,5%
CompleteRegistration   2.476    1,2%
Purchase                 772    0,4%
```

Cada visitante gera ~25 eventos de pixel antes de fazer qualquer coisa
comercial. **Nenhum conjunto de anúncios otimiza este pixel** (conferido nas
contas CA1, CA3, CA4 e CA7), então limpá-lo não afeta otimização — afeta o
Gerenciador de Eventos, os públicos de remarketing e os sinais de aprendizado.

## A causa

Em `track()`, dentro do HTML servido pelos Workers `bloqueios-telas` e
`bloqueio-desbloqueio`: toda chamada é reenviada ao `fbq`, as da lista `fbStd`
como evento PADRÃO (incluindo `ViewContent`, disparado em cada tela) e todo o
resto como `trackCustom`. O analytics interno e o pixel de anúncio saem pela
mesma porta.

## A correção (3 linhas)

Trocar, no bloco `// 1. Meta Pixel client-side`:

```js
    const fbStd = ['PageView','ViewContent','Lead','InitiateCheckout','AddToCart','Purchase','CompleteRegistration'];
    if (fbStd.includes(name)) fbq('track', name, params, { eventID: eventId });
    else fbq('trackCustom', name, params, { eventID: eventId });
```

por:

```js
    // Só sinal de VENDA vai para o pixel de anúncio. Pergunta respondida, tela
    // vista e etapa de quiz continuam indo para o analytics interno e para o
    // dashboard — nunca para a Meta. Antes daqui, 43% do volume do pixel era
    // QuizAnswer e 18% ViewContent; venda era 0,4%.
    const PIXEL_VENDA = ['PageView','Purchase'];
    if (PIXEL_VENDA.includes(name)) fbq('track', name, params, { eventID: eventId });
```

**`PageView` fica de propósito.** É um por carregamento, não uma ação do lead, e
é dele que sai a métrica `landing_page_view` do Gerenciador. Tirar também é
trocar `['PageView','Purchase']` por `['Purchase']` — e aí o pixel para de
receber qualquer coisa vinda das páginas.

Efeito medido sobre o volume atual: **208.679 → ~61.769 eventos (−70%)**,
restando `PageView` e `Purchase`.

O que NÃO muda: as 17 chamadas de `track()` continuam existindo, e o analytics
interno (`ANALYTICS_URL`) e o dashboard (`DASH_API`, incluindo o `buyclick`)
continuam recebendo tudo. Só o ramo do `fbq` é filtrado.

## Como aplicar

As páginas são Workers de **assets estáticos** (`serve_directly: true`), sem
bindings, `compatibility_date` 2024-11-01, publicados por wrangler
(`digizionpro@gmail.com`). Não há script — o HTML é um asset.

**Caminho recomendado:** quem tem o fonte aplica a troca e roda `wrangler deploy`
nos dois projetos.

**Caminho pela API** (se não houver fonte): os 13 assets de `bloqueios-telas`
foram enumerados e conferidos um a um (200 OK) —
`/index.html`, `/robots.txt` e 11 imagens em `/img/`:
`bonus-cura-interior.webp`, `bonus-despertar.webp`, `bonus-detox-alma.webp`,
`bonus-diagnostico.webp`, `bonus-vip.webp`, `depo-carro.jpg`,
`depo-escassez.jpg`, `depo-investimentos.jpg`, `depo-prospero.jpg`,
`heranca-crenca.jpg`, `selo-garantia.png`.

Sessão de upload já testada e aceita com hash = primeiros 32 hex do SHA-256:
`POST /accounts/{id}/workers/scripts/{worker}/assets-upload-session`.

**Rollback:** versão anterior de `bloqueios-telas` é
`e946ee86-409a-499e-817a-a7bfc4686a4b` (deployment
`74e49cf2-9b03-4b15-8001-65338900b402`). Voltar por ela restaura o estado atual.

## Conferência obrigatória depois do deploy

1. A página abre e tem o mesmo tamanho aproximado (107 KB).
2. As 11 imagens respondem 200.
3. O quiz avança da capa para a primeira pergunta.
4. `trackCustom` não existe mais no HTML servido.
5. No Gerenciador de Eventos, em algumas horas: só `PageView` e `Purchase`.

Se qualquer uma falhar, rollback imediato pela versão acima.
