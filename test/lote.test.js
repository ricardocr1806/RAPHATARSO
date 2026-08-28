'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { emBlocos, criarOrcamento, lerEmEtapas, marcarConclusao } = require('../src/lote');

test('nenhum bloco encosta no teto silencioso de ~100 parâmetros', () => {
  const ids = Array.from({ length: 200 }, (_, i) => i);
  const blocos = emBlocos(ids);
  assert.equal(blocos.length, 3);
  assert.ok(blocos.every((b) => b.length <= 90));
  assert.equal(blocos.flat().length, 200); // nenhum item some no caminho
});

test('orçamento de chamadas para antes do teto, e diz onde parou', () => {
  const o = criarOrcamento({ teto: 1000, margem: 0.9 });
  assert.equal(o.limite, 900);
  for (let i = 0; i < 900; i += 1) o.gastar();
  assert.equal(o.cabe(1), false);
  assert.throws(() => o.gastar(), /orçamento de chamadas esgotado: 900\/900/);
});

test('etapa extra que falha não derruba o que já foi lido (11 de 11, não 0 de 11)', async () => {
  const ids = Array.from({ length: 11 }, (_, i) => `id-${i}`);
  const r = await lerEmEtapas({
    ids,
    etapaBase: async (xs) => xs.map((id) => ({ id, nome: `n-${id}` })),
    etapaExtra: async () => {
      throw new Error('campo inexistente para este objeto: a requisição inteira foi recusada');
    },
  });
  assert.equal(r.itens.length, 11);
  assert.equal(r.extraOk, false);
  assert.match(r.erroExtra, /recusada/);
});

test('etapa extra bem-sucedida enriquece sem perder a base', async () => {
  const r = await lerEmEtapas({
    ids: ['a'],
    etapaBase: async () => [{ id: 'a', nome: 'n' }],
    etapaExtra: async () => [{ id: 'a', gasto: 10 }],
  });
  assert.deepEqual(r.itens, [{ id: 'a', nome: 'n', gasto: 10 }]);
});

test('15 de 152 não é concluída: é parcial, com 137 pendentes', () => {
  const r = marcarConclusao({ processados: 15, total: 152 });
  assert.equal(r.estado, 'parcial');
  assert.equal(r.pendentes, 137);
});

test('processar tudo com falha ainda não é concluída', () => {
  assert.equal(marcarConclusao({ processados: 152, total: 152, falhas: 3 }).estado, 'parcial');
  assert.equal(marcarConclusao({ processados: 152, total: 152 }).estado, 'concluida');
});
