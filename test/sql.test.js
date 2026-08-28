'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { montarIn, contemSensivelACaixa, recusarLikeSensivel } = require('../src/sql');

test('200 ids viram três cláusulas IN, nenhuma acima de 90 parâmetros', () => {
  const ids = Array.from({ length: 200 }, (_, i) => `id-${i}`);
  const partes = montarIn(ids, { coluna: 'checkout_id' });
  assert.equal(partes.length, 3);
  assert.ok(partes.every((p) => p.tamanho <= 90));
  assert.equal(partes.reduce((s, p) => s + p.tamanho, 0), 200);
  assert.match(partes[0].sql, /^checkout_id IN \(\?(,\?)+\)$/);
});

test('lista vazia não vira "IN ()" — vira nenhuma cláusula', () => {
  assert.deepEqual(montarIn([]), []);
});

test('trecho com curinga de GLOB é recusado em vez de casar demais', () => {
  assert.throws(() => contemSensivelACaixa('nome', '[ir-'), /curinga de GLOB/);
  assert.throws(() => contemSensivelACaixa('nome', 'ir*'), /curinga de GLOB/);
});

test('busca sensível a caixa sai como GLOB, nunca LIKE', () => {
  const c = contemSensivelACaixa('nome', 'IR-2ED');
  assert.equal(c.sql, 'nome GLOB ?');
  assert.deepEqual(c.params, ['*IR-2ED*']);
  assert.ok(!/LIKE/i.test(c.sql));
});

test('SQL com LIKE é recusado onde a caixa importa', () => {
  assert.throws(() => recusarLikeSensivel("SELECT 1 WHERE nome LIKE '%ir-%'"), /GLOB/);
  assert.equal(recusarLikeSensivel("SELECT 1 WHERE nome GLOB '*IR-*'"), true);
});
