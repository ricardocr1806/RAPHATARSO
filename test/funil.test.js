'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  pessoasPorTela,
  ultimaTelaComGente,
  quedaContraAnterior,
  filtrarPorAnuncio,
  compararBracos,
} = require('../src/funil');

const ev = (session_id, tela_numero, o = {}) => ({
  session_id,
  tela_numero,
  tela_nome: `tela-${tela_numero}`,
  ad_id: 'ad-1',
  ...o,
});

test('quem volta e avança de novo continua sendo uma pessoa', () => {
  const telas = pessoasPorTela([ev('s1', 1), ev('s1', 2), ev('s1', 1), ev('s1', 2), ev('s2', 1)]);
  assert.deepEqual(telas.map((t) => t.pessoas), [2, 1]);
});

test('evento sem session_id não é contado em silêncio', () => {
  assert.throws(() => pessoasPorTela([ev(null, 1)]), /sem session_id/);
});

test('o fim do funil é a última tela COM GENTE, não a última linha da tabela', () => {
  const telas = [
    { tela: 1, nome: 'capa', pessoas: 100 },
    { tela: 2, nome: 'p1', pessoas: 40 },
    { tela: 39, nome: 'p38', pessoas: 38 },
    { tela: 40, nome: 'obrigado', pessoas: 0 }, // existe na tabela, não tem gente
  ];
  assert.equal(ultimaTelaComGente(telas).tela, 39);
  assert.notEqual(ultimaTelaComGente(telas).pessoas, 0); // senão a conversão seria 0% para sempre
});

test('funil sem ninguém devolve ausência de tela, não a última linha', () => {
  assert.equal(ultimaTelaComGente([{ tela: 1, nome: 'capa', pessoas: 0 }]), null);
});

test('a queda mora no primeiro clique: 60% da capa para a pergunta 1, e 0% a 3% depois', () => {
  const telas = [
    { tela: 1, nome: 'capa', pessoas: 100 },
    { tela: 2, nome: 'p1', pessoas: 40 },
    { tela: 3, nome: 'p2', pessoas: 39 },
    { tela: 4, nome: 'p3', pessoas: 39 },
  ];
  const q = quedaContraAnterior(telas);
  assert.equal(q[0].queda, null); // a capa não tem contra o quê medir
  assert.equal(q[1].queda, 0.6);
  assert.equal(q[2].queda, 0.025);
  assert.equal(q[3].queda, 0);
  // Medida contra a base (100), a tela 3 pareceria ter perdido 61% — e a culpa
  // da tela 2 sumiria no meio.
  assert.ok(q[2].queda < 0.05);
});

test('comparar braços sem dizer o anúncio é comparar públicos diferentes', () => {
  assert.throws(() => filtrarPorAnuncio([ev('s1', 1)], null), /públicos diferentes/);
});

test('o filtro por anúncio tira o tráfego de outra campanha da comparação', () => {
  const eventos = [ev('s1', 1), ev('s2', 1, { ad_id: 'ad-2' })];
  assert.equal(filtrarPorAnuncio(eventos, 'ad-1').length, 1);
});

test('64,9% contra 52,0% com 100 pessoas por braço é empate técnico', () => {
  const r = compararBracos({ a: { pessoas: 100, conversoes: 65 }, b: { pessoas: 100, conversoes: 52 } });
  assert.equal(r.veredito, 'empate_tecnico');
  assert.match(r.texto, /ainda não dá para decidir/);
  assert.ok(r.a.min <= r.b.max); // as faixas se cobrem
});

test('33% contra 29% com 20 pessoas por braço é amostra insuficiente, não vitória', () => {
  const r = compararBracos({ a: { pessoas: 20, conversoes: 7 }, b: { pessoas: 20, conversoes: 6 } });
  assert.equal(r.veredito, 'amostra_insuficiente');
});

test('faixas separadas dão vencedor, e o texto traz os dois números', () => {
  const r = compararBracos({ a: { pessoas: 200, conversoes: 180 }, b: { pessoas: 200, conversoes: 80 } });
  assert.equal(r.veredito, 'a_vence');
  assert.match(r.texto, /90\.0% vs 40\.0%/);
});
