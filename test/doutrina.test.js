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
