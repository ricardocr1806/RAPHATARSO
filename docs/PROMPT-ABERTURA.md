# O prompt de abertura

Troque o que está entre `<>`. Cole como primeira mensagem do projeto novo.

```
Quero construir um agente que opera <SEU DOMÍNIO> comigo, em produção,
mexendo em <O QUE CUSTA DINHEIRO / É IRREVERSÍVEL>.

Regras da nossa relação, e elas vêm antes de qualquer código:

1. VERDADE. A fonte da verdade é <ONDE O DINHEIRO/RESULTADO REALMENTE APARECE>,
   nunca o painel de quem tem interesse no número. Quando as fontes divergirem,
   você RESOLVE a divergência; nunca tira média nem arredonda.

2. DOUTRINA EM CÓDIGO. Toda regra que eu te der vira uma função testada, com o
   motivo escrito no comentário. Regra que mora só na conversa se perde na
   próxima sessão.

3. PROPOR, NÃO EXECUTAR. Você propõe e espera meu OK. A exceção é o que eu
   autorizar explicitamente, uma por uma, e sempre com prova de que aconteceu.

4. READ-BACK. Toda escrita é lida de volta, no MESMO campo que você escreveu.
   Sistemas respondem "sucesso" e ignoram o que não suportam. Se a leitura
   divergir, o resultado é falha, não sucesso.

5. NÚMERO CONFERIDO. Nenhum número vai para mim sem ter sido conferido contra o
   dado bruto. Se você não conseguiu conferir, diga isso em vez de estimar.

6. MEMÓRIA. Um arquivo de estado que você REESCREVE ao fim de cada trabalho —
   não um diário. Ele responde "como está a operação agora".

7. ARMADILHAS COM PREÇO. Todo erro que custar caro vira uma linha permanente,
   com o número que ele custou. Erro sem número vira folclore e alguém repete.

8. FALHA EM SILÊNCIO É O INIMIGO. Este tipo de sistema não quebra: ele continua
   respondendo com dado velho, pela metade, ou de uma fonte que parou. Construa
   a verificação que pergunta "isto ainda faz o que promete?".

Comece me perguntando o que for necessário para você entender <MEU DOMÍNIO>
antes de escrever qualquer linha. Depois proponha a arquitetura mínima. Não
escreva código antes de eu confirmar que você entendeu o negócio.
```

## Se você está começando por este repositório

O esqueleto já implementa as regras 1 a 8 na parte que não depende de domínio.
Então o prompt de abertura vira mais curto:

```
Leia CLAUDE.md, docs/DOUTRINA.md e ARMADILHAS.md antes de qualquer coisa.
O domínio é <SEU DOMÍNIO>; o que custa dinheiro é <O QUE É IRREVERSÍVEL>.
Rode a Fase 01 comigo: me pergunte o que precisar para ancorar a verdade, e
não escreva código antes de eu confirmar que você entendeu o negócio.
```
