'use strict';

/**
 * VENDAS — a fonte da verdade.
 *
 * O pixel da Meta conta pedido GERADO; o dinheiro entra no pedido PAGO. Este
 * arquivo só conhece o pago, o pendente e o reembolsado — nunca a atribuição.
 */

const config = require('../config.json');
const { diaOperacional } = require('./tempo');

const STATUS = Object.freeze({
  PAGO: 'pago',
  PENDENTE: 'pendente',
  REEMBOLSADO: 'reembolsado',
});

/**
 * Consolida itens de webhook em VENDAS, uma por checkout.
 *
 * EPISÓDIO: com order bump, cada item vira um pedido com id próprio. Contar por
 * pedido inflou a contagem de vendas em 11% a 20%. A chave é o checkout.
 *
 * EPISÓDIO: contar backend no denominador do custo por venda barateia o número
 * sem uma venda de entrada a mais ter acontecido — R$ 40,44 no lugar de
 * R$ 54,22, 26% mais barato, e o erro explode justo no dia em que o carrinho do
 * produto principal abre. Por isso cada venda carrega `tipo`.
 */
function consolidarVendas(itens, { fuso = config.tempo.fusoDaVerdade } = {}) {
  const porCheckout = new Map();

  for (const item of itens) {
    const checkout = item.checkout_id;
    if (!checkout) {
      throw new TypeError('item sem checkout_id: sem a chave de contagem não há venda');
    }
    if (!Object.values(STATUS).includes(item.status)) {
      throw new TypeError(`status desconhecido: ${item.status}`);
    }
    const dia = diaOperacional(item.pago_em ?? item.criado_em, fuso);
    const atual = porCheckout.get(checkout) ?? {
      checkout_id: checkout,
      dia,
      status: item.status,
      tipo: null,
      valor: 0,
      itens: 0,
      bid: item.bid ?? null,
    };
    atual.valor += Number(item.valor) || 0;
    atual.itens += 1;
    // Um checkout que contém o produto de entrada é uma venda de FRONT, mesmo
    // que traga bumps junto. Só é backend quem não tem front nenhum dentro.
    if (item.tipo === 'front') atual.tipo = 'front';
    else if (atual.tipo === null) atual.tipo = 'backend';
    // Reembolso em qualquer item contamina o checkout inteiro; pendente só
    // sobrevive se nada foi pago.
    if (item.status === STATUS.REEMBOLSADO) atual.status = STATUS.REEMBOLSADO;
    else if (item.status === STATUS.PAGO && atual.status === STATUS.PENDENTE) atual.status = STATUS.PAGO;
    porCheckout.set(checkout, atual);
  }

  return [...porCheckout.values()];
}

/** Vendas de FRONT pagas — o único denominador legítimo do custo por venda. */
function vendasFront(vendas, { dia = null } = {}) {
  return vendas.filter(
    (v) => v.tipo === 'front' && v.status === STATUS.PAGO && (dia === null || v.dia === dia),
  );
}

/**
 * Custo por venda. Sem venda no denominador o resultado é AUSÊNCIA de número,
 * nunca Infinity nem zero.
 *
 * EPISÓDIO: zero é uma afirmação. "Este link não custou nada" mandaria escalar
 * algo que talvez esteja queimando verba.
 */
function custoPorVenda({ gasto, vendas }) {
  if (!Number.isFinite(gasto)) {
    return { valor: null, motivo: 'gasto_nao_lido' };
  }
  if (vendas === 0) {
    return { valor: null, motivo: 'sem_venda_no_denominador', gasto };
  }
  return { valor: Number((gasto / vendas).toFixed(2)), gasto, vendas };
}

/**
 * O cenário otimista, obrigatório antes de cortar: e se TODO pendente pagar?
 *
 * EPISÓDIO: do dia corrente 42% dos checkouts ainda estão pendentes; de ontem,
 * 10%; de anteontem, 5%. Todo dia recente lê o custo por venda mais caro do que
 * vai terminar — e na linha de corte isso é a diferença entre cortar e não
 * cortar uma campanha saudável.
 */
function custoSeTodoPendentePagar({ gasto, vendasPagas, vendasPendentes }) {
  const otimista = custoPorVenda({ gasto, vendas: vendasPagas + vendasPendentes });
  const atual = custoPorVenda({ gasto, vendas: vendasPagas });
  return { atual, otimista, pendentes: vendasPendentes };
}

/**
 * Fração ainda por compensar, por idade do dia. Usada para dizer na tela que o
 * número de hoje vai melhorar, e para impedir decisão sobre janela aberta.
 */
function fracaoPendenteEsperada(idadeEmDias) {
  const tabela = config.tempo.fracaoPendentePorIdadeDoDia;
  const chave = String(Math.max(0, idadeEmDias));
  return chave in tabela ? tabela[chave] : 0;
}

module.exports = {
  STATUS,
  consolidarVendas,
  vendasFront,
  custoPorVenda,
  custoSeTodoPendentePagar,
  fracaoPendenteEsperada,
};
