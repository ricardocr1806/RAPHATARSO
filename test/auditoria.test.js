'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  rodarAuditoria,
  compararBatimentoComDado,
  avaliarContagem,
  verificarVersaoNoAr,
} = require('../src/auditoria');

test('exceção dentro de um bloco vira achado crítico, nunca "nenhum problema"', async () => {
  const r = await rodarAuditoria([
    {
      nome: 'gasto_do_dia',
      executar: async () => {
        throw new Error('conexão recusada');
      },
    },
  ]);
  assert.equal(r.criticos, 1);
  assert.match(r.achados[0].detalhe, /falha_de_bloco: conexão recusada/);
  assert.match(r.achados[0].acao, /não rodou/);
});

test('verificação sem número é ela mesma um achado', async () => {
  const r = await rodarAuditoria([
    { nome: 'fila_de_propostas', executar: async () => ({ gravidade: 'ok', detalhe: 'tudo certo' }) },
  ]);
  assert.equal(r.criticos, 1);
  assert.match(r.achados[0].detalhe, /não devolveu número/);
});

test('batimento verde com 10h sem dado: quem tem razão é o dado', () => {
  const r = compararBatimentoComDado({
    batimentoOk: true,
    ultimoDadoEm: '2026-08-28T06:00:00Z',
    agora: '2026-08-28T16:00:00Z',
    nome: 'webhook_de_pagamento',
  });
  assert.equal(r.gravidade, 'critico');
  assert.equal(r.numero, 10);
  assert.match(r.detalhe, /batimento VERDE/);
  assert.match(r.acao, /não decidir nada com esta fonte/);
});

test('fonte fresca passa, e passa com número', () => {
  const r = compararBatimentoComDado({
    batimentoOk: true,
    ultimoDadoEm: '2026-08-28T15:30:00Z',
    agora: '2026-08-28T16:00:00Z',
  });
  assert.equal(r.gravidade, 'ok');
  assert.equal(r.numero, 0.5);
});

test('zero linha é achado, não ausência confirmada', () => {
  const r = avaliarContagem({ linhas: 0, nome: 'consulta_em_lote' });
  assert.equal(r.gravidade, 'critico');
  assert.equal(r.numero, 0);
  assert.match(r.acao, /conferir/);
});

test('commit no repositório não é código no ar', () => {
  const r = verificarVersaoNoAr({ versaoDoRepo: 'abc123', versaoNoAr: 'def456' });
  assert.equal(r.gravidade, 'critico');
  assert.match(r.detalhe, /não estão valendo/);
  assert.equal(verificarVersaoNoAr({ versaoDoRepo: 'abc', versaoNoAr: 'abc' }).gravidade, 'ok');
});

test('auditoria que não conseguiu ser gravada não conta como auditoria feita', async () => {
  const r = await rodarAuditoria(
    [{ nome: 'ok', executar: async () => ({ gravidade: 'ok', numero: 1, detalhe: '', acao: 'nenhuma' }) }],
    {
      persistir: async () => {
        throw new Error('banco indisponível');
      },
    },
  );
  assert.equal(r.gravado, false);
  assert.equal(r.criticos, 1);
  assert.match(r.achados.at(-1).detalhe, /não foi gravada/);
});

test('auditoria limpa é gravada e diz que foi', async () => {
  const gravados = [];
  const r = await rodarAuditoria(
    [{ nome: 'frescor', executar: async () => ({ gravidade: 'ok', numero: 0.2, detalhe: 'fresco', acao: 'nenhuma' }) }],
    { persistir: async (x) => gravados.push(x) },
  );
  assert.equal(r.criticos, 0);
  assert.equal(r.gravado, true);
  assert.equal(gravados.length, 1);
});
