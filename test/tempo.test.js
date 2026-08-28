'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { diaOperacional, parseDataBR, exigirMesmaJanela, classificarJanela } = require('../src/tempo');

test('venda de 23h30 no fuso de quem emite pertence ao dia dela, não ao seguinte', () => {
  // 2026-08-29T02:30:00Z = 23h30 do dia 28 em São Paulo.
  const instante = '2026-08-29T02:30:00Z';
  assert.equal(diaOperacional(instante, 'America/Sao_Paulo'), '2026-08-28');
  // O corte em UTC — o erro que transformou 21 vendas em 8 — daria o dia seguinte.
  assert.equal(diaOperacional(instante, 'UTC'), '2026-08-29');
});

test('data brasileira com dia > 12 sobrevive ao parser', () => {
  assert.equal(parseDataBR('13/08/2026'), '2026-08-13');
  // O parser nativo é justamente o que devolvia null/Invalid Date nesse caso.
  assert.ok(Number.isNaN(new Date('13/08/2026').getTime()));
});

test('data brasileira ambígua não vira mês-dia por acidente', () => {
  assert.equal(parseDataBR('05/08/2026'), '2026-08-05'); // 5 de agosto, não 8 de maio
});

test('comparar custo e receita em fusos diferentes é recusado', () => {
  const custo = { rotulo: 'custo', fuso: 'UTC', inicio: '2026-08-01', fim: '2026-08-28' };
  const receita = { rotulo: 'receita', fuso: 'America/Sao_Paulo', inicio: '2026-08-01', fim: '2026-08-28' };
  assert.throws(() => exigirMesmaJanela(custo, receita), /fusos diferentes/);
});

test('o dia corrente é parcial e não decide nada', () => {
  const hoje = classificarJanela({ dia: '2026-08-28', hoje: '2026-08-28' });
  assert.equal(hoje.estado, 'parcial');
  assert.equal(hoje.decidivel, false);
  assert.equal(hoje.fracaoPendente, 0.42);

  const ontem = classificarJanela({ dia: '2026-08-27', hoje: '2026-08-28' });
  assert.equal(ontem.estado, 'fechada');
  assert.equal(ontem.decidivel, true);
});
