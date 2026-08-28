# As oito fases, na ordem

A ordem importa mais que a velocidade. Cada fase existe porque pular ela custou
caro em outro lugar. Cada uma tem entregável e critério de pronto.

---

## 01 · Ancorar a verdade

Antes de qualquer automação, decida de onde vem o número que decide. No domínio
anterior foi a venda paga por webhook, nunca a atribuição da plataforma de
anúncios — que inflava de 1,6x a 3,5x e contava o pedido na geração, não no
pagamento.

**A pergunta:** qual é o registro que ninguém tem interesse em inflar? É nele
que o sistema encosta. Tudo o mais é opinião com aparência de dado.

**Perguntas que precisam de resposta antes da primeira linha:**
1. Onde o resultado aparece de forma irreversível, e quem emite esse registro?
2. Que fuso horário esse emissor usa, e em que momento ele carimba o registro
   (na geração ou na conclusão)?
3. Qual é a chave única de um resultado — e o que, no seu domínio, faz parecer
   que são dois?
4. Quanto tempo leva entre o registro nascer e ficar definitivo? Que fração de
   um dia recente ainda pode mudar?
5. Que painel existe hoje, quem o mantém, e em quanto ele costuma divergir?
6. O que, exatamente, é irreversível quando o agente escreve?

**Entregável:** uma tabela de eventos crus, com carimbo de tempo no fuso certo,
e uma função que responde "quanto foi de verdade" sem passar por nenhum painel.
`config.verdade.fonte` deixa de ser placeholder.

**Pronto quando:** `npm run auditoria` para de acusar `verdade_ancorada`.

---

## 02 · Escrever a doutrina antes do motor

As regras vêm de você, em prosa, e viram funções puras e testadas — cada uma
com o EPISÓDIO que a gerou no comentário.

Função pura é o que permite o teste exercitar a decisão real. Quando o teste
carrega uma cópia da lógica, a cópia envelhece calada e passa a aprovar o que o
sistema já não faz.

**Entregável:** regras em `src/doutrina.js`, limiares em `config.json`, e um
teste por regra que descreve o caso real, não o caso abstrato.

**Pronto quando:** cada exportação da doutrina tem pelo menos um teste com nome
de caso real (a auditoria conta).

---

## 03 · Medir antes de propor — inclusive a solução óbvia

A saída natural costuma estar errada, e medir custa pouco.

No domínio anterior: um diagnóstico empatava em 19% dos casos e a solução óbvia
era "faltam perguntas". Medido: 3 perguntas levavam a 26,5% de empate e 4 a
23,2% — mais pergunta com peso igual PIORA. O que resolveu foi peso diferente
por pergunta: 5,1%. Construir o óbvio teria entregue uma piora com cara de
melhoria.

**Entregável:** o hábito de medir a hipótese antes de codificá-la, e de guardar
a medição junto com a decisão (no comentário da regra e na mensagem do commit).

---

## 04 · Propor, esperar OK, e medir o custo da espera

O sistema começa propondo tudo. Depois de meses de operação, meça: lá, 54% das
propostas expiravam sem resposta — 105 de 194 em 7 dias. Foi essa medição que
justificou abrir execução automática para três gatilhos específicos, e só eles.

**A linha que separa:** entra o que PARA de gastar por ausência de resultado.
Não entra nada que gaste, nada que dependa de uma média que ainda vai mudar.

**Entregável:** uma fila de propostas com estado, expiração e registro de quem
aprovou. A automação vem depois, medida, uma régua por vez.

**Pronto quando:** existe o número de propostas expiradas — antes dele, nenhum
gatilho automático é ligado.

---

## 05 · Read-back, com segunda chance

Toda escrita é lida de volta, no mesmo campo. Duas armadilhas espelhadas:

- atraso de leitura-após-escrita cria alarme falso (1 em 6 objetos pausados
  voltou ATIVO na primeira leitura e PAUSADO três segundos depois) — e alarme
  falso ensina a ignorar o alarme;
- read-back que nunca lia nada respondia "a leitura falhou" em TODA pausa. A
  ação mais perigosa do sistema era a única sem prova, e passou meses assim
  porque a mensagem aparecia sempre.

**Entregável:** ler de volta o mesmo campo que escreveu, uma segunda tentativa
antes de declarar divergência, registro do antes/depois, e `leitura_vazia`
como falha distinta de `divergencia`. Já implementado em `src/readback.js`;
falta ligá-lo ao adaptador do seu domínio.

---

## 06 · A auditoria que audita a si mesma

Construa na primeira semana, não no terceiro mês. Duas lições que valem em
qualquer domínio:

- batimento é o que o sistema DIZ de si, e o dado é o que ele FEZ. Quando
  discordam, quem tem razão é o dado (uma fonte ficou 10h fora do ar com o
  batimento verde);
- bloco de auditoria com catch que engole exceção vira "nenhum problema
  encontrado". Leitura que não aconteceu nunca pode ser reportada como boa
  notícia.

**Entregável:** uma rota de auditoria onde cada verificação traz NÚMERO e
AÇÃO, falha de bloco É um achado, e o resultado fica gravado — não só na tela.

---

## 07 · Memória que é estado, não diário

Um arquivo reescrito a cada trabalho, respondendo "como está agora". O histórico
mora nos commits, e as mensagens de commit contam o PORQUÊ, não o quê.

**Entregável:** `ESTADO.md` (estado), `docs/DOUTRINA.md` (prosa) e
`ARMADILHAS.md` (preço). O diário não existe.

---

## 08 · As armadilhas, com o preço de cada uma

A lista mais valiosa do repositório. Ela parece burocracia até a terceira vez
que você repete o mesmo erro.

**Entregável:** `ARMADILHAS.md`, carregado sozinho em toda sessão via
`CLAUDE.md`.

**Objetivo declarado:** que a lista pare de crescer por descoberta e passe a
crescer por antecipação.
