'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { escreverComLeitura } = require('../src/readback');

const semEspera = async () => {};

test('atraso de leitura-após-escrita não vira alarme falso na segunda tentativa', async () => {
  // Reproduz o objeto que voltou ATIVO na primeira leitura e PAUSADO 3s depois.
  let leituras = 0;
  const r = await escreverComLeitura({
    id: 'obj-1',
    campo: 'estado',
    valorEsperado: 'pausado',
    escrever: async () => ({ sucesso: true }),
    // leitura 1 = o "antes"; leitura 2 = pós-escrita, ainda com atraso; leitura 3 = já pausado.
    ler: async () => ({ estado: (leituras += 1) <= 2 ? 'ativo' : 'pausado' }),
    dormir: semEspera,
  });
  assert.equal(r.ok, true);
  assert.equal(r.tentativasUsadas, 2); // a segunda leitura é o que evita o alarme falso
  assert.equal(r.antes, 'ativo');
  assert.equal(r.depois, 'pausado');
});

test('read-back que não lê nada é FALHA por leitura vazia, não sucesso', async () => {
  const r = await escreverComLeitura({
    id: 'obj-2',
    campo: 'estado',
    valorEsperado: 'pausado',
    escrever: async () => ({ sucesso: true }),
    ler: async () => null, // o read-back que passou meses sem ler nada
    dormir: semEspera,
  });
  assert.equal(r.ok, false);
  assert.equal(r.motivo, 'leitura_vazia');
});

test('campo ausente na resposta é leitura vazia, não valor diferente', async () => {
  const r = await escreverComLeitura({
    id: 'obj-3',
    campo: 'estado',
    valorEsperado: 'pausado',
    escrever: async () => ({ sucesso: true }),
    ler: async () => ({ outro_campo: 'pausado' }), // sistema ignorou o campo escrito
    dormir: semEspera,
  });
  assert.equal(r.ok, false);
  assert.equal(r.motivo, 'leitura_vazia');
});

test('divergência real é distinta de leitura vazia e carrega antes/depois', async () => {
  const r = await escreverComLeitura({
    id: 'obj-4',
    campo: 'estado',
    valorEsperado: 'pausado',
    escrever: async () => ({ sucesso: true }), // "sucesso" mentiroso
    ler: async () => ({ estado: 'ativo' }),
    dormir: semEspera,
  });
  assert.equal(r.ok, false);
  assert.equal(r.motivo, 'divergencia');
  assert.equal(r.antes, 'ativo');
  assert.equal(r.lido, 'ativo');
  assert.equal(r.esperado, 'pausado');
  assert.deepEqual(r.respostaDaEscrita, { sucesso: true });
});

test('ler campo diferente do que se escreveu não é prova e é recusado', async () => {
  await assert.rejects(
    escreverComLeitura({
      id: 'obj-5',
      campo: '',
      valorEsperado: 'pausado',
      escrever: async () => ({}),
      ler: async () => ({}),
    }),
    /sem campo/,
  );
});
