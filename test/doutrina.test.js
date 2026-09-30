'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  resolverDivergencia,
  contarUnicos,
  decidir,
  ESTADOS_DE_PROPOSTA,
  avaliarProposta,
  podeExecutarSemOK,
  apresentarNumero,
  agruparEmCheckouts,
} = require('../src/doutrina');

test('divergência é resolvida pela fonte de verdade, nunca pela média', () => {
  // 10 vendas pagas; o painel de quem tem interesse diz 25 (inflação de 2,5x).
  const r = resolverDivergencia({ verdade: 10, painel: 25 });
  assert.equal(r.valor, 10);
  assert.equal(r.fonte, 'verdade');
  assert.equal(r.inflacao, 2.5);
  assert.equal(r.alerta, 'inflacao_conhecida_do_painel');
  assert.notEqual(r.valor, 17.5); // a média — o número que não existe em lugar nenhum
});

test('inflação fora da faixa conhecida é divergência inexplicada, não rotina', () => {
  const r = resolverDivergencia({ verdade: 10, painel: 90 });
  assert.equal(r.alerta, 'divergencia_inexplicada');
  assert.equal(r.valor, 10);
});

test('painel ausente não impede o número: a verdade basta', () => {
  const r = resolverDivergencia({ verdade: 7, painel: undefined });
  assert.equal(r.valor, 7);
  assert.equal(r.alerta, 'painel_ausente');
});

test('order bump não vira venda nova', () => {
  const eventos = [
    { pedido_id: 'A', transacao_id: 't1' },
    { pedido_id: 'A', transacao_id: 't1' }, // mesmo pagamento, item adicional
    { pedido_id: 'B', transacao_id: 't2' },
  ];
  assert.equal(contarUnicos(eventos).total, 2);
  assert.equal(contarUnicos(eventos).duplicadosIgnorados, 1);
  // Contar por pedido daria o mesmo aqui; o inflacionamento aparece quando o
  // bump gera pedido próprio — por isso a chave é a transação, sempre.
  assert.equal(contarUnicos(eventos, { chave: 'pedido_id' }).total, 2);
});

test('evento sem identidade não é contado em silêncio', () => {
  assert.throws(() => contarUnicos([{ transacao_id: '' }]), /sem transacao_id/);
});

test('14 dias e 1 resultado é corte — o limiar de volume não protege o gasto', () => {
  const r = decidir({ resultados: 1, diasAtivo: 14, gasto: 300 });
  assert.equal(r.acao, 'cortar');
  assert.equal(r.exigencia, 'tempo');
});

test('3 dias e 0 resultado ainda não é corte: falta TEMPO', () => {
  assert.equal(decidir({ resultados: 0, diasAtivo: 3, gasto: 300 }).acao, 'aguardar');
});

test('promover exige volume e vem antes do corte', () => {
  const r = decidir({ resultados: 5, diasAtivo: 30, gasto: 300 });
  assert.equal(r.acao, 'promover');
  assert.equal(r.exigencia, 'volume');
});

test('janela parcial não decide nada, nem corte nem promoção', () => {
  const r = decidir({ resultados: 0, diasAtivo: 30, gasto: 900, janelaDecidivel: false });
  assert.equal(r.acao, 'aguardar');
  assert.equal(r.motivo, 'janela_parcial');
});

test('negada pelo dono é terminal; barrada pelo sistema não é', () => {
  const criadaEm = '2026-08-01T00:00:00Z';
  const agora = '2026-08-28T00:00:00Z';
  const negada = avaliarProposta({ estado: ESTADOS_DE_PROPOSTA.NEGADA_PELO_DONO, criadaEm, agora });
  assert.equal(negada.estado, ESTADOS_DE_PROPOSTA.NEGADA_PELO_DONO);
  assert.equal(negada.mudou, false);

  const barrada = avaliarProposta({ estado: ESTADOS_DE_PROPOSTA.BARRADA_PELO_SISTEMA, criadaEm, agora });
  assert.equal(barrada.mudou, false);
  assert.notEqual(ESTADOS_DE_PROPOSTA.BARRADA_PELO_SISTEMA, ESTADOS_DE_PROPOSTA.NEGADA_PELO_DONO);
});

test('proposta pendente por 7 dias expira, e a expiração fica registrada', () => {
  const r = avaliarProposta({
    estado: ESTADOS_DE_PROPOSTA.PENDENTE,
    criadaEm: '2026-08-01T00:00:00Z',
    agora: '2026-08-08T00:00:00Z',
  });
  assert.equal(r.estado, ESTADOS_DE_PROPOSTA.EXPIRADA);
  assert.equal(r.diasSemResposta, 7);
});

test('nada executa sem OK enquanto a lista de gatilhos estiver vazia', () => {
  assert.equal(podeExecutarSemOK('pausar_o_que_nao_entrega').permitido, false);
});

test('gatilho que gasta dinheiro nunca entra na execução automática', () => {
  const r = podeExecutarSemOK('subir_orcamento', { gasta: true });
  assert.equal(r.permitido, false);
  assert.equal(r.motivo, 'gatilho_gasta_dinheiro');
});

test('número não conferido sai vazio, com o motivo — nunca estimado', () => {
  const r = apresentarNumero({ valor: 1234, conferidoContra: null });
  assert.equal(r.apresentavel, false);
  assert.equal(r.valor, null);
  assert.equal(r.motivo, 'nao_conferido_contra_dado_bruto');

  const ok = apresentarNumero({ valor: 1234, conferidoContra: 'eventos_crus', amostra: 42 });
  assert.equal(ok.apresentavel, true);
  assert.equal(ok.valor, 1234);
});

// ── reconstruir o checkout quando a plataforma não dá um (episódio 30/09/2026)

test('a mesma transação chegando como approved e como completed 7 dias depois é UMA venda', () => {
  const { checkouts } = agruparEmCheckouts([
    { transacao_id: 't1', comprador: 'ana@x.com', valor: 67, pago: true, em: '2026-08-12T18:47:50Z' },
    { transacao_id: 't1', comprador: 'ana@x.com', valor: 67, pago: true, em: '2026-08-19T18:47:50Z' },
  ]);
  assert.equal(checkouts.length, 1);
  assert.equal(checkouts[0].valor, 67);   // e NÃO 134: o eco não é dinheiro novo
});

test('order bump 40 segundos depois do pedido é receita do mesmo checkout, não segunda venda', () => {
  const { checkouts, achados } = agruparEmCheckouts([
    { transacao_id: 'p1', comprador: 'joabe@x.com', valor: 67, pago: true, em: '2026-07-17T10:34:45Z' },
    { transacao_id: 'b1', comprador: 'joabe@x.com', valor: 39.9, pago: true, tipo_item: 'order_bump', em: '2026-07-17T10:35:25Z' },
  ]);
  assert.equal(checkouts.length, 1);
  assert.equal(checkouts[0].itens, 2);
  assert.equal(Math.round(checkouts[0].valor * 100) / 100, 106.9);
  assert.deepEqual(achados, []);
});

test('bump a 6 minutos do pedido está fora da janela e vira achado, não venda', () => {
  const { checkouts, achados } = agruparEmCheckouts([
    { transacao_id: 'p1', comprador: 'nadia@x.com', valor: 67, pago: true, em: '2026-07-17T10:36:26Z' },
    { transacao_id: 'b1', comprador: 'nadia@x.com', valor: 39.9, pago: true, tipo_item: 'order_bump', em: '2026-07-17T10:42:30Z' },
  ]);
  assert.equal(checkouts.length, 1);
  assert.equal(checkouts[0].valor, 67);
  assert.equal(achados.length, 1);
  assert.equal(achados[0].tipo, 'bump_sem_checkout');
});

test('bump de outro comprador no mesmo minuto não cola no checkout alheio', () => {
  const { checkouts, achados } = agruparEmCheckouts([
    { transacao_id: 'p1', comprador: 'ana@x.com', valor: 67, pago: true, em: '2026-07-17T10:00:00Z' },
    { transacao_id: 'b1', comprador: 'bruno@x.com', valor: 39.9, pago: true, tipo_item: 'order_bump', em: '2026-07-17T10:00:30Z' },
  ]);
  assert.equal(checkouts[0].valor, 67);
  assert.equal(achados.length, 1);
});

test('linha não paga não vira venda nem recebe bump', () => {
  const { checkouts } = agruparEmCheckouts([
    { transacao_id: 'p1', comprador: 'ana@x.com', valor: 67, pago: false, em: '2026-09-20T10:00:00Z' },
  ]);
  assert.deepEqual(checkouts, []);
});

test('as três contagens do episódio: 4 linhas, 3 transações, 2 checkouts', () => {
  const linhas = [
    { transacao_id: 'p1', comprador: 'ana@x.com', valor: 67, pago: true, em: '2026-08-12T18:00:00Z' },
    { transacao_id: 'p1', comprador: 'ana@x.com', valor: 67, pago: true, em: '2026-08-19T18:00:00Z' },
    { transacao_id: 'b1', comprador: 'ana@x.com', valor: 39.9, pago: true, tipo_item: 'order_bump', em: '2026-08-12T18:01:00Z' },
    { transacao_id: 'p2', comprador: 'bruno@x.com', valor: 67, pago: true, em: '2026-08-13T09:00:00Z' },
  ];
  const { checkouts } = agruparEmCheckouts(linhas);
  assert.equal(linhas.length, 4);
  assert.equal(new Set(linhas.map((l) => l.transacao_id)).size, 3);
  assert.equal(checkouts.length, 2);
});

test('linha sem transacao_id é erro, não silêncio', () => {
  assert.throws(() => agruparEmCheckouts([{ comprador: 'ana@x.com', valor: 67, pago: true }]), TypeError);
});
