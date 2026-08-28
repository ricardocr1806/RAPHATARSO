'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  escolherBraco,
  fatiasComPisoETeto,
  destinoComRedeDeSeguranca,
  classificarClique,
} = require('../src/bandit');

/** Gerador determinístico: o sorteio precisa ser reproduzível para ser testável. */
function rngSemente(semente) {
  let s = semente >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

test('com três cliques o bandit ainda não decide: divide igual no aquecimento', () => {
  const bracos = [
    { id: 'a', cliques: 3, conversoes: 3 }, // 100% em três cliques
    { id: 'b', cliques: 0, conversoes: 0 },
  ];
  const r = escolherBraco(bracos, { rng: rngSemente(1) });
  assert.equal(r.modo, 'aquecimento');
  assert.equal(r.braco.id, 'b'); // o menos visto, não o de melhor taxa
});

test('passado o aquecimento, o braço melhor ganha na maioria dos sorteios', () => {
  const bracos = [
    { id: 'bom', cliques: 100, conversoes: 50 },
    { id: 'ruim', cliques: 100, conversoes: 5 },
  ];
  const rng = rngSemente(42);
  let bom = 0;
  for (let i = 0; i < 300; i += 1) {
    if (escolherBraco(bracos, { rng, aquecimento: 50 }).braco.id === 'bom') bom += 1;
  }
  assert.ok(bom > 285, `bom venceu ${bom}/300`);
});

test('empate de amostra não vira vencedor fixo: os dois braços aparecem', () => {
  const bracos = [
    { id: 'a', cliques: 100, conversoes: 20 },
    { id: 'b', cliques: 100, conversoes: 20 },
  ];
  const rng = rngSemente(7);
  const vistos = new Set();
  for (let i = 0; i < 200; i += 1) vistos.add(escolherBraco(bracos, { rng, aquecimento: 50 }).braco.id);
  assert.deepEqual([...vistos].sort(), ['a', 'b']);
});

test('braço desativado não é sorteado', () => {
  const r = escolherBraco(
    [
      { id: 'morto', cliques: 999, conversoes: 900, ativo: false },
      { id: 'vivo', cliques: 999, conversoes: 10 },
    ],
    { rng: rngSemente(3) },
  );
  assert.equal(r.braco.id, 'vivo');
});

test('link sem braço ativo estoura aqui, para cair na rede de segurança', () => {
  assert.throws(() => escolherBraco([{ id: 'a', cliques: 1, conversoes: 0, ativo: false }]), /sem destino/);
});

test('exceção no sorteio manda para o controle, nunca para uma página branca', () => {
  const r = destinoComRedeDeSeguranca(() => {
    throw new Error('banco fora');
  }, 'https://controle.exemplo/pagina');
  assert.equal(r.destino, 'https://controle.exemplo/pagina');
  assert.match(r.motivo, /excecao_no_sorteio/);
});

test('sorteio que devolve vazio também cai no controle', () => {
  const r = destinoComRedeDeSeguranca(() => null, 'https://controle.exemplo/pagina');
  assert.equal(r.destino, 'https://controle.exemplo/pagina');
  assert.equal(r.motivo, 'sorteio_sem_destino');
});

test('99 contra 1: o vencedor para no teto de 80% e o resto vai para o perdedor', () => {
  const f = fatiasComPisoETeto({ a: 99, b: 1 }, { piso: 0.05, teto: 0.8 });
  assert.equal(f.a, 0.8); // normalizar depois de cortar devolvia 0,94 — acima do próprio teto
  assert.equal(f.b, 0.2);
  assert.ok(Math.abs(f.a + f.b - 1) < 1e-6);
});

test('braço sem clique nenhum ainda recebe o piso, e as fatias somam 1', () => {
  const f = fatiasComPisoETeto({ a: 100, b: 0, c: 0 }, { piso: 0.05, teto: 0.8 });
  assert.equal(f.a, 0.8);
  assert.ok(f.b >= 0.05 && f.c >= 0.05);
  assert.ok(Math.abs(f.a + f.b + f.c - 1) < 1e-6);
});

test('teto baixo demais para o número de braços é recusado em vez de devolver fatia impossível', () => {
  assert.throws(() => fatiasComPisoETeto({ a: 1, b: 1, c: 1 }, { piso: 0.05, teto: 0.3 }), /teto baixo/);
});

test('rastreador conhecido é filtrado', () => {
  assert.equal(classificarClique({ userAgent: 'facebookexternalhit/1.1' }).contar, false);
});

test('clique dos EUA com fbclid é MOSTRADO como suspeito, nunca recusado', () => {
  const r = classificarClique({ userAgent: 'Mozilla/5.0 (iPhone)', pais: 'US', temFbclid: true });
  assert.equal(r.contar, true); // recusar apagaria a venda que ele traria
  assert.equal(r.marcar, 'suspeito_revisao_da_meta');
});

test('clique comum do Brasil conta sem marca', () => {
  const r = classificarClique({ userAgent: 'Mozilla/5.0 (Android)', pais: 'BR' });
  assert.equal(r.contar, true);
  assert.equal(r.marcar, null);
});
