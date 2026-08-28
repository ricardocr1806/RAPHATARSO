'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { decidirCampanha, montarProposta } = require('../src/decisao');
const { ACOES } = require('../src/regras');

const ctx = (o = {}) => ({
  campanha: { id: 'cmp-1', status: 'ACTIVE', orcamentoDiario: 100, deTerceiro: false },
  conta: { ativa: true, tetoDeCustoPorVenda: 60 },
  gastoDoPeriodo: 400,
  horasDeVida: 240,
  numerosConferidos: true,
  vendasEmQualquerFonte: 5,
  escalouHoje: false,
  diasFechados: [
    { dia: '2026-08-27', gasto: 200, vendasFront: 4, vendasFrontPendentes: 0 },
    { dia: '2026-08-26', gasto: 200, vendasFront: 4, vendasFrontPendentes: 0 },
  ],
  ...o,
});

test('campanha de terceiro sai antes de qualquer análise', () => {
  const d = decidirCampanha(ctx({ campanha: { id: 'x', status: 'ACTIVE', orcamentoDiario: 1, deTerceiro: true } }));
  assert.equal(d.acao, ACOES.IGNORAR);
  assert.equal(d.regra, 'R14');
});

test('gasto zerado com campanha ativa é conta para investigar, não decisão do algoritmo', () => {
  const d = decidirCampanha(ctx({ gastoDoPeriodo: 0 }));
  assert.equal(d.acao, ACOES.INVESTIGAR_CONTA);
  assert.equal(d.motivo, 'campanha_ativa_sem_gasto');
});

test('número não conferido não vira proposta', () => {
  const d = decidirCampanha(ctx({ numerosConferidos: false }));
  assert.equal(d.acao, ACOES.NAO_PROPOR);
  assert.equal(d.regra, 'R16');
});

test('gastou o teto e não gerou venda em fonte nenhuma é corte de emergência', () => {
  const d = decidirCampanha(ctx({ gastoDoPeriodo: 60, vendasEmQualquerFonte: 0 }));
  assert.equal(d.acao, ACOES.CORTAR_EMERGENCIA);
  assert.equal(d.regra, 'RE');
});

test('campanha com 47h é MANTER por definição, mesmo cara', () => {
  const d = decidirCampanha(
    ctx({
      horasDeVida: 47,
      diasFechados: [
        { dia: '2026-08-27', gasto: 500, vendasFront: 1, vendasFrontPendentes: 0 },
        { dia: '2026-08-26', gasto: 500, vendasFront: 1, vendasFrontPendentes: 0 },
      ],
    }),
  );
  assert.equal(d.acao, ACOES.MANTER);
  assert.equal(d.regra, 'R09');
});

test('um único dia fechado não autoriza reduzir nem cortar', () => {
  const d = decidirCampanha(
    ctx({ diasFechados: [{ dia: '2026-08-27', gasto: 500, vendasFront: 0, vendasFrontPendentes: 0 }] }),
  );
  assert.equal(d.acao, ACOES.MANTER);
  assert.equal(d.motivo, 'dias_fechados_insuficientes');
});

test('dois dias fechados acima do teto reduzem — e o dia corrente não entra na conta', () => {
  const d = decidirCampanha(
    ctx({
      // R$ 250/venda nos dois fechados, teto de 60.
      diasFechados: [
        { dia: '2026-08-27', gasto: 500, vendasFront: 2, vendasFrontPendentes: 0 },
        { dia: '2026-08-26', gasto: 500, vendasFront: 2, vendasFrontPendentes: 0 },
      ],
      diaCorrente: { gasto: 999, vendasFront: 0 },
    }),
  );
  assert.equal(d.acao, ACOES.REDUZIR);
  assert.equal(d.regra, 'R2D');
});

test('cara nos dois dias, mas barata se todo pendente pagar, é MANTER', () => {
  const d = decidirCampanha(
    ctx({
      // 1000 / 10 pagas = 100 (acima do teto de 60); com 8 pendentes: 55,56.
      diasFechados: [
        { dia: '2026-08-27', gasto: 500, vendasFront: 5, vendasFrontPendentes: 4 },
        { dia: '2026-08-26', gasto: 500, vendasFront: 5, vendasFrontPendentes: 4 },
      ],
    }),
  );
  assert.equal(d.acao, ACOES.MANTER);
  assert.match(d.motivo, /^barata_se_pendentes_pagarem_55\.56$/);
});

test('dois dias fechados sem venda nenhuma é corte, não redução', () => {
  const d = decidirCampanha(
    ctx({
      diasFechados: [
        { dia: '2026-08-27', gasto: 300, vendasFront: 0, vendasFrontPendentes: 0 },
        { dia: '2026-08-26', gasto: 300, vendasFront: 0, vendasFrontPendentes: 0 },
      ],
    }),
  );
  assert.equal(d.acao, ACOES.CORTAR);
  assert.equal(d.motivo, 'dois_dias_fechados_sem_venda');
});

test('dois dias fechados abaixo do teto escalam +20%, e o orçamento proposto vem junto', () => {
  const d = decidirCampanha(ctx());
  assert.equal(d.acao, ACOES.ESCALAR);
  assert.equal(d.percentual, 0.2);
  assert.equal(d.orcamentoProposto, 120);
});

test('campanha que já escalou hoje não escala de novo', () => {
  const d = decidirCampanha(ctx({ escalouHoje: true }));
  assert.equal(d.acao, ACOES.MANTER);
  assert.equal(d.motivo, 'ja_escalou_hoje');
});

test('contexto sem teto de custo por venda não decide nada — estoura', () => {
  assert.throws(
    () => decidirCampanha(ctx({ conta: { ativa: true } })),
    /contexto incompleto: conta.tetoDeCustoPorVenda/,
  );
});

test('manter não gera proposta na fila', () => {
  const veredito = decidirCampanha(ctx({ escalouHoje: true }));
  assert.equal(montarProposta({ veredito, numeros: { x: 1 }, agora: '2026-08-28T00:00:00Z' }), null);
});

test('proposta sem números que a sustentem é recusada', () => {
  const veredito = decidirCampanha(ctx());
  assert.throws(
    () => montarProposta({ veredito, numeros: {}, agora: '2026-08-28T00:00:00Z' }),
    /sem números/,
  );
});

test('proposta nasce pendente, sem executor e sem aprovador', () => {
  const veredito = decidirCampanha(ctx());
  const p = montarProposta({
    veredito,
    numeros: { custoPorVenda: 50, teto: 60 },
    agora: '2026-08-28T00:00:00Z',
  });
  assert.equal(p.estado, 'pendente');
  assert.equal(p.aprovadaPor, null);
  assert.equal(p.executadaEm, null);
  assert.equal(p.regra, 'R08');
});
