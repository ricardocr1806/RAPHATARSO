# RAPHATARSO

Um motor que decide o que fazer com campanhas de Meta Ads a partir de **venda
paga confirmada**, e não da atribuição que a Meta reporta. Ele propõe ações e só
executa com OK humano.

**A tese, em uma frase:** o pixel da Meta conta pedido GERADO; o dinheiro entra
no pedido PAGO. Entre os dois há uma diferença medida de 1,59x a 3,5x e uma taxa
de pagamento de ~0,68. Um sistema que otimiza pelo número da Meta escala o que
parece bom.

## Por onde entrar

| Se você quer | Leia |
|---|---|
| Saber como está a operação agora | `ESTADO.md` |
| Não repetir erro caro que já foi pago | `ARMADILHAS.md` (40, todas com número) |
| Entender de onde vem o número que decide | `docs/FASE-01-VERDADE.md` |
| Ver as regras da relação e por que existem | `docs/DOUTRINA.md` |
| A ordem das decisões, com entregável por fase | `docs/FASES.md` |
| Começar um agente destes em outro domínio | `docs/PROMPT-ABERTURA.md` |
| Trabalhar no código | `CLAUDE.md` |

## Os comandos

```
npm test           # 111 testes, sem dependências externas
npm run mutacao    # reintroduz 15 defeitos reais; todos precisam ficar VERMELHOS
npm run auditoria  # 9 verificações sobre o próprio repositório, resultado gravado
```

`npm run mutacao` existe porque teste que você nunca viu falhar não prova nada.
Ele apaga a linha do checkout, corta o dia em UTC, tira o aquecimento do bandit,
faz a auditoria engolir a própria exceção — e exige que a suíte fique vermelha em
cada caso.

## O que decide

- `src/vendas.js` — venda é o CHECKOUT (order bump não é venda nova: +11% a
  +20%); o denominador do custo é só o FRONT (contar backend deu R$ 40,44 no
  lugar de R$ 54,22); pendente não é ausência de venda.
- `src/regras.js` — as 16 regras da operação como DADOS, mais a regra dos dois
  dias fechados: o dia corrente nunca decide, porque 42% dos checkouts dele
  ainda estão pendentes; e antes de cortar, a campanha precisa continuar cara
  mesmo que todo pendente pague.
- `src/decisao.js` — o motor percorre as regras e devolve o veredito dizendo
  QUAL regra decidiu. A saída é uma proposta, nunca uma escrita.
- `src/meta/` — campos por nível com degradação (`campaign_id` no nível de
  campanha derruba a requisição inteira), read-back no mesmo campo, e rate limit
  na leitura devolvendo `escrito_sem_conferir` em vez de reescrever.
- `src/bandit.js` — Thompson Sampling com aquecimento, piso e teto; exceção no
  sorteio cai no controle, porque link de anúncio nunca pode devolver erro.
- `src/funil.js` — pessoa e não evento, queda contra a tela anterior, e
  "empate técnico" escrito na tela enquanto as faixas de 95% se cobrirem.
- `src/tempo.js`, `src/sql.js`, `src/lote.js`, `src/readback.js`,
  `src/auditoria.js` — as travas que não são sobre tráfego.

## O que ainda não existe

Nenhum Worker, nenhum banco provisionado, nenhum cron: o núcleo é puro e espera
os adaptadores de rede. E as duas conferências que só quem tem as credenciais
faz continuam **críticas** na auditoria:

1. o gasto do sistema batendo com o Gerenciador, ao centavo, em três campanhas;
2. uma compra de teste com order bump virando UMA venda.

Enquanto elas não forem gravadas, nenhum número daqui foi conferido contra o
dado bruto — e pela regra 16 ele não vira proposta.

## Duas coisas ditas em voz alta

**O que eu faria diferente se recomeçasse hoje.** Construiria a auditoria na
primeira semana, não no terceiro mês — todo defeito caro deste tipo de sistema é
uma falha silenciosa que ela pegaria em horas. E escreveria o arquivo de
armadilhas desde o primeiro dia.

**O que não daria certo sem quem opera.** As regras que mais economizaram
dinheiro não vieram de análise: vieram de alguém olhando a tela e dizendo "esse
número está errado". O agente mede e propõe rápido; quem sabe o que o número
significa no negócio é quem opera.
