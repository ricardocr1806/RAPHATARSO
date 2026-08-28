'use strict';

/**
 * SQL — o que o D1 recusa em silêncio.
 */

const { emBlocos } = require('./lote');

/**
 * Monta cláusulas IN já quebradas em blocos.
 *
 * EPISÓDIO: o D1 recusa acima de ~100 parâmetros ligados SEM ERRO — `IN (?,?,…)`
 * com 200 marcadores volta sem linha nenhuma e sem erro. Zero linha é
 * indistinguível de "não há nada".
 */
function montarIn(ids, { coluna = 'id' } = {}) {
  if (ids.length === 0) return [];
  return emBlocos(ids).map((bloco) => ({
    sql: `${coluna} IN (${bloco.map(() => '?').join(',')})`,
    params: bloco,
    tamanho: bloco.length,
  }));
}

/**
 * Comparação de prefixo que respeita a caixa.
 *
 * EPISÓDIO: `LIKE` no SQLite ignora maiúscula. Procurar `'%[ir-%'` casou com
 * `[IR-2ED]`, que era outro produto, e trouxe R$ 280 de campanha alheia para
 * dentro do custo. `GLOB` compara caixa.
 */
function contemSensivelACaixa(coluna, trecho) {
  if (/[?*[\]]/.test(trecho)) {
    throw new RangeError(`trecho com curinga de GLOB não pode ser usado cru: ${trecho}`);
  }
  return { sql: `${coluna} GLOB ?`, params: [`*${trecho}*`] };
}

/**
 * Recusa LIKE quando o que se quer é distinguir caixa. Existe para falhar no
 * teste, não em produção.
 */
function recusarLikeSensivel(sql) {
  if (/\bLIKE\b/i.test(sql)) {
    throw new Error('LIKE ignora caixa no SQLite — use GLOB (ver R$ 280 em ARMADILHAS.md)');
  }
  return true;
}

module.exports = { montarIn, contemSensivelACaixa, recusarLikeSensivel };
