# Estado

> Reescrito ao fim de cada trabalho. Não é diário: responde "como está a
> operação agora". O histórico mora nos commits.

**Atualizado em:** 2026-09-16
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

| Peça | Arquivo |
|---|---|
| Tempo e fusos · doutrina portável (8 regras, com `agruparEmCheckouts`) | `src/tempo.js`, `src/doutrina.js` |
| Vendas (checkout, front/backend, pendentes) · 16 regras como dados · motor | `src/vendas.js`, `src/regras.js`, `src/decisao.js` |
| Graph API com degradação, read-back e rate limit | `src/meta/campos.js`, `src/meta/escrita.js` |
| Bandit · funil (Wilson) · blocos de 90 · GLOB no lugar de LIKE | `src/bandit.js`, `src/funil.js`, `src/lote.js`, `src/sql.js` |
| Read-back com segunda chance · auditoria que não engole exceção | `src/readback.js`, `src/auditoria.js` |

```
npm test      # 118 testes, sem dependências externas
npm run mutacao   # 18 defeitos reintroduzidos, todos precisam ficar VERMELHOS
npm run auditoria # 9 verificações, gravado em .auditoria/ultima.json
```

## Vermelho agora, e por quê

Resta **1 crítica**: `gasto_conferido_com_o_gerenciador` — ninguém comparou o
gasto de ontem de três campanhas com o Gerenciador, ao centavo. Grave em
`.conferencias/gerenciador.json`. Pela regra 16, nenhum número daqui vira
proposta enquanto isso.

`order_bump_conferido` ficou VERDE em 30/09 — não por compra de teste, mas por
conferência contra produção: 86 bumps reais, todos com pedido principal do mesmo
comprador em menos de 300s, e a regra sobre as 1.193 linhas devolve 0 órfãos.
Registro em `.conferencias/order-bump.json`, que é local (`.gitignore`).

E **1 de atenção**: `versao_no_ar` — nenhum processo no ar declara versão.

## O que NÃO existe ainda

- Nenhum Worker, banco provisionado ou cron do motor. O núcleo é puro e espera
  adaptadores: passos 1 (carga de gasto), 2 (webhook de venda), 7 (link
  inteligente) e 8 (api do funil) têm lógica escrita e testada, falta a borda de
  rede e as credenciais. Passos 9 (telas) e 4 (identidade): só o schema.
- `config.contas` só tem a entrada de exemplo, inativa — sem conta preenchida o
  motor não decide nada.

## Números que valem hoje

- 0 escritas na Meta feitas por este sistema.
- 0 propostas na fila.
- 0 gatilhos com execução automática — a lista está vazia de propósito.
- 62 armadilhas com preço; 18 delas com mutação que prova a trava.

**Conta CA3 em 29/09/2026:** **zero campanhas ativas.** Todas PAUSED, incluindo a
`[67-CBO][Quiz normal-Bloqueio2] 11-08` (R$ 750/dia) e as três que eu criei — a
CBO de 17/09 `120250507911370459`, a de 29/09 `120250683788910459`, e a ABO
`120250507792940459`, que foi erro meu e aguarda decisão de excluir.

**Campanha principal, 20-26/09, conferida contra venda paga:** gasto
R$ 5.249,92, 104 compras na Meta contra **79 conferidas**, CPA R$ 50,48 ditos
contra **R$ 66,45 reais**, margem no front **−R$ 255,02**. O front está no
vermelho, não no empate. Piso do erro: R$ 65,62, ainda acima do que a Meta diz.

## Achados na operação que está no ar (conta CA3)

Conferido contra a Graph API e os bancos D1 `gestor`, `quiz-eventos` e
`dashboardquiz-db`. **Onde mora o dado do quiz da CA3:** `dashboardquiz-db`, não
`quiz-eventos`. Cinco quizzes (`quizzes.id` 5 a 9) cobrem cinco dos sete destinos
dos anúncios; `quizmentem` e `quizz` (R$ 1.010,07 na janela) não têm quiz
cadastrado.

**A CA3 continua fora da carga de gasto** (`gestor.spend` cobre 4 contas, não
esta) e o motor não vê a venda: das 421 pagas da janela 31/07-29/08, 181 não
existem em `gestor.orders`. Elas existem no `dashboardquiz-db`, com o anúncio no
payload — é por lá que se confere, não pelo motor.

**Defeitos do dashboard ainda de pé:** `sales.amount` é o valor do ITEM, então
receita só fecha somando o bump dentro do checkout; 174 linhas sem `txn_id`,
todas não pagas. O contador `quizzes.purchase` foi corrigido em 30/09.

**A capa: o contador de entrada infla.** `entry` dispara no `PageView` em
`bloqueio`, `bloqueios2` e `desafio2`, contando recarga, prefetch e robô — infla
de 41% a 54% contra o clique pago. Já `desafio` (V1) só conta na primeira
interação real: comparar os dois é comparar definições, não capas. Com o
denominador honesto (cliques no link), quem chega e responde a primeira pergunta:
bloqueios2 56,5% · desafio2 48,4% · bloqueio 42,8% · desafio V1 42,1%.

**A escada de etapas não cobre o funil.** O contador só avança em
`QuizAnswer`: o Desafio V2 tem 54 telas e 34 degraus; o Desbloqueio, 33 telas e
26 degraus. As telas cegas — presente, prova, formulário, carregamento,
resultado — são onde a perda mora: 21,3% no formulário e 6,7%/6,4%/5,6% nos
pares presente+prova, contra ~1% por pergunta. Um quarto par (Presente 4)
derruba só 0,3%: mesmo desenho, dez vezes menos perda. No Desbloqueio, os 71%
entre a última pergunta (2.930) e o clique em comprar (843) não têm degrau.

### A RAIZ: o Gerenciador conta PEDIDO EMITIDO, não pagamento (08/10/2026)

| janela | Meta conta | venda paga conferida | razão |
|---|--:|--:|--:|
| 20-26/09 | 105 | 73 | 0,695 |
| 01-07/10 | **75** | **51** | **0,680** |

A taxa de pagamento do PIX desta operação é **~0,68** (linha 24 deste arquivo).
A razão bate com ela nas duas janelas: o número do Gerenciador é o de pedidos
EMITIDOS, e 32% deles nunca pagam. Em 01-07/10 a Meta reportou R$ 5.025,00 em
75 compras de exatamente R$ 67,00 cada, sem nenhum bump de R$ 39,90 — valor da
OFERTA na emissão, não do carrinho pago. A venda real foi R$ 3.656,40.

Todos os 76 eventos de `Purchase` do pixel `1130253591753543` vêm com
`event_source = SERVER`, `event_source_url = pay.onprofit.com.br` e uma
assinatura única de parâmetros (`content_type`, `content_ids`, `currency`,
`num_items`, `value`; match por email, external_id, fn, ln, phone). **Assinatura
única significa que nenhuma regra de conversão personalizada separa pago de não
pago.** Não é duplicação navegador×servidor e não é atribuição (101 das 105 eram
clique de 1 dia).

Duplicação EXISTE, só não no Resultado: em 01-07/10 PageView veio 407 navegador
+ 349 servidor, InitiateCheckout 310 + 330, e `Purchase` 0 + 76.

**O caminho construído, INCOMPLETO.** Pixel dedicado **`1097102566581494`**
("Venda Paga Conferida (motor)") criado, para ser alimentado só com checkout pago
conferido via Conversions API: `event_id = checkout_id` (a Meta deduplica
sozinha), valor real com bump dentro, `content_name = venda_paga_conferida`.
Depois os conjuntos apontam para ele e o Resultado vira venda paga. Estado real:
**11 eventos aceitos**, o resto recusado — a Meta não aceita evento com mais de
7 dias, e o classificador de permissão deste ambiente barra mandar dado de
cliente à Meta mesmo hasheado. O `stats` do pixel novo voltou VAZIO, e leitura
vazia não é sucesso: **o mecanismo NÃO está provado.**

**Não trocar o pixel dos conjuntos antes disso.** A campanha
`[67-CBO][Quiz normal-Bloqueio2] 11-08` está ATIVA a R$ 750/dia; trocar o
`promoted_object` zera o aprendizado dela — e um reinício já custou R$ 500 nesta
conta (ver ARMADILHAS.md).

### PÁGINAS: corrigidas as duas que faltavam (08/10/2026)

Em 27/09 eu limpei `bloqueio` e `bloqueios2`, que usam o pixel `4856…933` —
**que nenhum conjunto otimiza.** As páginas que alimentam o `1130…543`, o pixel
que todos otimizam, eram `desafio2`, `desafio` e `lpdmm`, e ficaram 11 dias
intactas. O `desafio2` é o destino da campanha de 29/09.

| worker | versão de rollback | estado |
|---|---|---|
| `desafio2` | `05cd35d7-9a67-4975-8ebd-eab9e0cb1bb6` | **corrigido, sha256 idêntico** |
| `lpdmm` | `5aaebe43-28ea-4dc3-9c9e-2905914e24a5` | **corrigido, sha256 idêntico** |
| `chatt-tracker` (serve `desafio`) | `fb41a758-e1de-407e-9d25-4e7108b1b44a` | **não corrigido** |

O `desafio` não é asset: o `chatt-tracker` é proxy de
`mente-milionaria-embed-9zj.pages.dev` e injeta tracking com HTMLRewriter. O
`fbStd` vem da origem, que não aparece na listagem de Pages desta conta;
corrigir exige reescrever o proxy. Tem R$ 1.257 em 12 meses e nenhuma campanha
apontada — ficou por último de propósito.

### O que os conjuntos mandam contar

Os **200 conjuntos** apontam para o mesmo evento — 113 em OFFSITE_CONVERSIONS e
87 em VALUE, todos PURCHASE no pixel `1130253591753543`. Nenhum otimiza lead,
clique ou engajamento. O problema nunca foi a configuração do conjunto: é o que
a plataforma de checkout manda para esse pixel (ver A RAIZ, acima).

A predefinição de COLUNAS é visualização por usuário e não tem endpoint na API.

### O painel marca conversão (corrigido 30/09, read-back conferido)

`quizzes.purchase` estava **0 nos cinco** desde sempre — o único contador nunca
escrito. Gravado o certo: bloqueios2 289 · desbloqueio 216 · lpdmm 117 · desafio
23 · desafio2 18. Total **663**, receita R$ 46.884,90. A regra é
`agruparEmCheckouts` em `src/doutrina.js` (7 testes, 3 mutações), rodada sobre as
1.193 linhas reais: 0 bumps órfãos. As três contagens possíveis: LINHA 912,
TRANSAÇÃO 746, CHECKOUT 663. O código do painel não está nesta conta Cloudflare,
então não dá para ver se ele LÊ essa coluna nem para atualizá-la sozinha.

**Financeiro:** estava em `account_status=9` (carência) em 30/08; hoje ATIVA, com saldo devedor de R$ 1.877,21.

### A atribuição anúncio → venda NÃO está morta

O que estava morto era `gestor.orders`. A venda paga chega ao `dashboardquiz-db`
com o anúncio no payload: `sales.raw` traz `utm_content = "<nome>|<ad_id>"`, mais
campanha e conjunto, em **920 transações pagas de 17/07 a 27/09, 100% de
cobertura**, 830 casando com anúncio da CA3 — Assiny e OnProfit, mesmo webhook.
**Criativo passa a ser avaliado por VENDA PAGA conferida, não pela compra que a
Meta reporta.** Para refazer: agrupar por CHECKOUT (`agruparEmCheckouts`), janela
de gasto igual à da venda, `amount` em CENTAVOS. **Só existe porque a UTM carrega
`{{ad.id}}`** — anúncio novo sem `url_tags` completo volta a ser cego.

Reagrupando pela mídia real, **17 criativos têm 3+ vendas pagas conferidas** na
janela 17/07-26/09. Os 12 melhores por CPA real ficam todos abaixo do ticket de
R$ 67,00 — de R$ 13,08 a R$ 64,24.

### Campanha criada em 29/09 — PAUSADA, na CA3

**`120250683788910459`** · `[67-CBO][12 VALIDADOS POR VENDA PAGA][Desafio2]`,
CBO R$ 300/dia, OUTCOME_SALES, 3 conjuntos `[Validados] — 01/02/03` sem orçamento
próprio, OFFSITE_CONVERSIONS, pixel 1130…543 PURCHASE, 1 dia de clique, BR 18-65.
12 anúncios, **12 criativos e 12 mídias distintas**, `url_tags` completo com
`{{ad.id}}` conferido no read-back, gasto R$ 0,00. Serpentina por CPA real deixa
os conjuntos comparáveis (39,57 / 41,25 / 43,17). Em 30/09 alguém ativou 11 dos
12 anúncios e renomeou para 30-09; a campanha segue PAUSED.

**Ressalva:** CPA não viaja com o criativo. Onze dos doze vêm de outro destino, e
o desafio2 é o pior dos cinco no clique→venda (9,9% contra 24,9% do Desbloqueio).
A campanha testa criativo validado, não o destino. A de 17/09
(`120250507911370459`) segue PAUSADA com R$ 0,00 — foi montada com o ranking
antigo, o da compra reportada pela Meta por destino.

**Pendência:** a campanha `120250507792940459` (mesma coisa em ABO) foi criada
por engano meu antes desta e segue PAUSADA com R$ 0,00 gasto. Precisa ser
apagada assim que o dono confirmar.

**84% do gasto de 12 meses (R$ 274.113 de R$ 324.861) foi para destino sem quiz
cadastrado** — `quiz`, `quizz`, `capaquizz`, `quizmentem`, `quizcheckout`. Não os
torna cegos: a venda deles cai em `sales` com `quiz_id` NULO mas COM
`utm_content`, e 187 transações pagas da janela são desse grupo. Dá para validar
criativo ali por anúncio; o que não dá é ler o funil por etapa.

**Os cinco quizzes na mesma régua** (31/07-29/08; o front perde R$ 5.148,22).
Por ponta a ponta × CPA × margem: Bloqueios 3,52% · R$ 67,82 · −424,76 |
LP-DMM — · **R$ 61,99** · **+241,20** | Desbloqueio 2,03% · R$ 83,79 ·
**−4.034,52** | Desafio V2 1,71% · R$ 81,83 · −502,50 | Desafio V1 1,24% ·
R$ 494,64 · −427,64.

**O bloqueios2 é a versão melhor do Desbloqueio, e leva 1/3 da verba** — mesmo
checkout e ticket, 1,74x melhor ponta a ponta, vantagem quase toda da capa.
Aritmética das alavancas: Desbloqueio com a capa do bloqueios2 (42,9% → 57,2%)
vai a 280 vendas e margem +R$ 1.082,17; Desafio V2 pagando como o Desbloqueio
(9,9% → 24,9%) vai a 45 vendas e +R$ 970,55.

**A corrente fecha do clique pago à venda**, por eventos próprios (`lead`,
`buyclick`). Acumulado Desbloqueio × Desafio V2: clique pago 10.359 × 1.052 →
começou o quiz 4.441 (−57,1%) × 509 (−51,6%) → última pergunta 3.664 × 333 →
formulário 3.196 × 275 → entrou na oferta 2.932 × 262 → **clicou em comprar 843
(−71,2%) × 182 (−26,0%)** → venda paga 210 × 18. Clique→venda: **2,0% × 1,7%**.

A página de vendas do Desbloqueio é a segunda maior perda: 2.089 pessoas. Lead
R$ 5,61, clique em comprar R$ 22,95. Problemas opostos: o Desbloqueio custa caro
para arrancar o clique mas converte (24,9% paga); o V2 arranca o clique fácil e
quase ninguém paga (9,9%). O degrau 26 não é pergunta: é o micro-compromisso da
`renderSalesCommit()` — o quiz tem 25 perguntas.

**O funil completo EXISTE — noutro servidor, e falta a chave.** `renderStep()`
dispara `QuizStep` (`session_id`, `step_index`, `step_type`) para TODA tela e
manda a `quiz-analytics.iaplx.workers.dev/track`, que tem `/api/drop_off` pronta.
As rotas `/api/*` respondem 401 e o worker está na conta Cloudflare `iaplx` (a
nossa é `digizionpro`), fora do `CLOUDFLARE_API_TOKEN`. É o pedido mais barato
que existe para fechar o diagnóstico do funil.

**Checkout:** `desafio`/`desafio2` usam Assiny embutido, `bloqueio`/`bloqueios2`
redirect para a OnProfit — mas a venda paga dos CINCO chega ao dashboard pelo
mesmo webhook (`platform = assiny/webhook`), com UTM de anúncio. A divisão vale
para o que o MOTOR vê, não para o que é conferível.

**LP-DMM:** 114 vendas, CPA R$ 61,99 — o melhor dos cinco destinos. O MOTOR não
as vê; o dinheiro existe.

## Próximo passo

**Para o número do Gerenciador virar venda paga, nesta ordem:**

1. Liberar a permissão de envio à Meta neste ambiente (o classificador barra
   mandar dado de cliente, mesmo hasheado). Sem isso o pixel novo não enche.
2. Enviar a janela de 6 dias ao pixel `1097102566581494` e conferir que ele
   devolve o MESMO número da conferência. Enquanto o `stats` vier vazio, o
   mecanismo não está provado.
3. Com o mecanismo provado, decidir a troca do `promoted_object` dos conjuntos
   para esse pixel. **Isso zera o aprendizado** da
   `[67-CBO][Quiz normal-Bloqueio2] 11-08`, ATIVA a R$ 750/dia — decisão do dono,
   não minha. A campanha `120250683788910459` está PAUSADA e pode ser trocada sem
   custo nenhum, como prova.
4. Pôr o envio num Worker com cron lendo `dashboardquiz-db`. Hoje não existe.

**Alternativa mais barata, e que depende só de você:** no painel da OnProfit,
em `/dashboard/integrations/facebookpixel/{id}/edit`, ver se a integração deixa
escolher o STATUS que dispara o `Purchase`. Se der para pôr "pago" em vez de
"emitido", acaba ali e os passos 1-4 ficam desnecessários. Eu não consigo olhar:
eles não têm API (`api.onprofit.com.br` devolve a home do site).

**Continua pendente de antes:** a crítica `gasto_conferido_com_o_gerenciador`
(comparar o gasto de ontem de 3 campanhas ao centavo) e a página `desafio`.
