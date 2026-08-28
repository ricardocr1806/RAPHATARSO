'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  STATUS,
  consolidarVendas,
  vendasFront,
  custoPorVenda,
  custoSeTodoPendentePagar,
  fracaoPendenteEsperada,
} = require('../src/vendas');

const item = (o) => ({
  checkout_id: 'chk-1',
  pedido_id: 'ped-1',
  tipo: 'front',
  status: STATUS.PAGO,
  valor: 97,
  pago_em: '2026-08-27T14:00:00Z',
  ...o,
});

test('order bump com dois pedidos no mesmo checkout é UMA venda', () => {
  const vendas = consolidarVendas([
    item({ pedido_id: 'ped-1', valor: 97 }),
    item({ pedido_id: 'ped-2', valor: 47 }), // o bump, com id de pedido próprio
  ]);
  assert.equal(vendas.length, 1);
  assert.equal(vendas[0].itens, 2);
  assert.equal(vendas[0].valor, 144);
});

test('checkout com front e backend juntos conta como venda de front', () => {
  const vendas = consolidarVendas([
    item({ tipo: 'backend', pedido_id: 'ped-1' }),
    item({ tipo: 'front', pedido_id: 'ped-2' }),
  ]);
  assert.equal(vendas[0].tipo, 'front');
});

test('checkout só de backend não entra no denominador do custo por venda', () => {
  const vendas = consolidarVendas([
    item({ checkout_id: 'chk-front', tipo: 'front' }),
    item({ checkout_id: 'chk-back', tipo: 'backend', valor: 1997 }),
  ]);
  assert.equal(vendas.length, 2);
  assert.equal(vendasFront(vendas).length, 1);
});

test('contar backend no denominador barateia o custo em ~26% sem uma venda de entrada a mais', () => {
  const gasto = 2711;
  const soFront = custoPorVenda({ gasto, vendas: 50 });
  const comBackend = custoPorVenda({ gasto, vendas: 67 }); // 50 front + 17 backend
  assert.equal(soFront.valor, 54.22); // o número verdadeiro
  assert.equal(comBackend.valor, 40.46); // o número que já foi usado por engano
  const barateamento = 1 - comBackend.valor / soFront.valor;
  assert.ok(barateamento > 0.25 && barateamento < 0.27, `barateamento=${barateamento}`);
});

test('sem venda no denominador o custo é ausência de número, não zero nem Infinity', () => {
  const r = custoPorVenda({ gasto: 500, vendas: 0 });
  assert.equal(r.valor, null);
  assert.equal(r.motivo, 'sem_venda_no_denominador');
  assert.notEqual(r.valor, 0);
});

test('gasto não lido não vira custo por venda', () => {
  assert.equal(custoPorVenda({ gasto: undefined, vendas: 3 }).motivo, 'gasto_nao_lido');
});

test('venda de 23h30 fica no dia dela, no fuso de quem emite', () => {
  // 2026-08-28T02:30:00Z = 23h30 do dia 27 em São Paulo.
  const vendas = consolidarVendas([item({ pago_em: '2026-08-28T02:30:00Z' })]);
  assert.equal(vendas[0].dia, '2026-08-27');
});

test('reembolso em um item contamina o checkout inteiro', () => {
  const vendas = consolidarVendas([
    item({ pedido_id: 'ped-1', status: STATUS.PAGO }),
    item({ pedido_id: 'ped-2', status: STATUS.REEMBOLSADO }),
  ]);
  assert.equal(vendas[0].status, STATUS.REEMBOLSADO);
  assert.equal(vendasFront(vendas).length, 0);
});

test('checkout pendente que teve um item pago vira pago', () => {
  const vendas = consolidarVendas([
    item({ pedido_id: 'ped-1', status: STATUS.PENDENTE }),
    item({ pedido_id: 'ped-2', status: STATUS.PAGO }),
  ]);
  assert.equal(vendas[0].status, STATUS.PAGO);
});

test('item sem checkout_id não é contado em silêncio', () => {
  assert.throws(() => consolidarVendas([item({ checkout_id: null })]), /sem checkout_id/);
});

test('status desconhecido não atravessa a consolidação', () => {
  assert.throws(() => consolidarVendas([item({ status: 'aprovado' })]), /status desconhecido/);
});

test('antes de cortar, o cenário em que todo pendente paga é calculado', () => {
  const r = custoSeTodoPendentePagar({ gasto: 1000, vendasPagas: 10, vendasPendentes: 7 });
  assert.equal(r.atual.valor, 100);
  assert.equal(r.otimista.valor, 58.82);
  assert.equal(r.pendentes, 7);
});

test('a fração pendente cai de 42% no dia corrente para 5% em anteontem', () => {
  assert.equal(fracaoPendenteEsperada(0), 0.42);
  assert.equal(fracaoPendenteEsperada(1), 0.1);
  assert.equal(fracaoPendenteEsperada(2), 0.05);
  assert.equal(fracaoPendenteEsperada(9), 0);
});
