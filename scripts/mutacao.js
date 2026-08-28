#!/usr/bin/env node
'use strict';

/**
 * TESTE DE MUTAÇÃO — "não confie em teste que você não viu falhar".
 *
 * Reintroduz, um de cada vez, um defeito que já custou dinheiro, roda a suíte e
 * exige VERMELHO. Um defeito que passa verde significa que o teste
 * correspondente não prova nada — e isso é um achado, não um detalhe.
 *
 * O arquivo original é restaurado sempre, inclusive se a suíte estourar.
 */

const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const RAIZ = path.join(__dirname, '..');

const MUTACOES = [
  ['agrupar por pedido em vez de checkout', 'src/vendas.js',
    'const checkout = item.checkout_id;', 'const checkout = item.pedido_id;'],
  ['contar backend no denominador', 'src/vendas.js',
    "(v) => v.tipo === 'front' && v.status === STATUS.PAGO", '(v) => v.status === STATUS.PAGO'],
  ['cortar o dia em UTC', 'src/tempo.js',
    'timeZone: fuso,', "timeZone: 'UTC',"],
  ['cortar sem conferir o cenário otimista', 'src/regras.js',
    'if (cenario.otimista.valor !== null && cenario.otimista.valor <= teto) {', 'if (false) {'],
  ['um dia fechado basta para cortar', 'src/regras.js',
    'if (fechados.length < config.decisao.diasFechadosParaReduzirOuCortar) {', 'if (fechados.length < 1) {'],
  ['learning phase ignorada', 'src/regras.js',
    'ctx.horasDeVida < config.decisao.horasDeLearningPhase', 'false'],
  ['leitura vazia contada como sucesso', 'src/readback.js',
    "if (lido.estado === 'vazia') continue;",
    "if (lido.estado === 'vazia') return { ok: true, id, campo, depois: null, tentativasUsadas: tentativa, em: agora() };"],
  ['auditoria engolindo a própria exceção', 'src/auditoria.js',
    "        gravidade: 'critico',\n        numero: null,\n        detalhe: `falha_de_bloco:",
    "        gravidade: 'ok',\n        numero: 0,\n        detalhe: `falha_de_bloco:"],
  ['bandit sem aquecimento', 'src/bandit.js',
    '  const emAquecimento = ativos.filter((b) => b.cliques < aquecimento);', '  const emAquecimento = [];'],
  ['queda medida contra a base', 'src/funil.js',
    '    const anterior = telas[i - 1];', '    const anterior = telas[0];'],
  ['LIKE no lugar de GLOB', 'src/sql.js',
    'return { sql: `${coluna} GLOB ?`, params: [`*${trecho}*`] };',
    'return { sql: `${coluna} LIKE ?`, params: [`%${trecho}%`] };'],
  ['campo proibido liberado no nível de campanha', 'src/meta/campos.js',
    "  campanha: ['campaign_id', 'adset_id', 'ad_id'],", '  campanha: [],'],
  ['rate limit tratado como falha de escrita', 'src/meta/escrita.js',
    '    if (codigoDaMeta(erro) === RATE_LIMIT) {', '    if (false) {'],
  ['conclusão marcada sem ter acabado', 'src/lote.js',
    '  if (processados === total && falhas === 0) {', '  if (true) {'],
  ['blocos acima do teto do D1', 'src/lote.js',
    'function emBlocos(itens, tamanho = config.lote.parametrosPorBloco) {',
    'function emBlocos(itens, tamanho = 200) {'],
];

function suitePassa() {
  try {
    execSync('node --test test/*.test.js', { cwd: RAIZ, stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

const sobreviventes = [];
const naoAplicadas = [];

for (const [nome, arquivo, antes, depois] of MUTACOES) {
  const alvo = path.join(RAIZ, arquivo);
  const original = fs.readFileSync(alvo, 'utf8');
  if (!original.includes(antes)) {
    naoAplicadas.push(nome);
    console.log(`[ ???? ] ${nome} — a mutação não encontrou o trecho (o código mudou; atualize esta lista)`);
    continue;
  }
  let passou;
  try {
    fs.writeFileSync(alvo, original.replace(antes, depois));
    passou = suitePassa();
  } finally {
    fs.writeFileSync(alvo, original);
  }
  if (passou) {
    sobreviventes.push(nome);
    console.log(`[ VERDE ] ${nome} — NENHUM teste pegou este defeito`);
  } else {
    console.log(`[vermelho] ${nome}`);
  }
}

console.log(
  `\n${MUTACOES.length} defeitos reintroduzidos · ${sobreviventes.length} passariam despercebidos · ${naoAplicadas.length} não aplicadas`,
);
process.exitCode = sobreviventes.length > 0 || naoAplicadas.length > 0 ? 1 : 0;
