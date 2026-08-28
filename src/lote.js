'use strict';

/**
 * LOTE
 *
 * Tetos silenciosos: o sistema não erra, ele devolve menos.
 */

const config = require('../config.json');

/**
 * Quebra em blocos que cabem no teto de parâmetros da consulta.
 *
 * EPISÓDIO: o banco recusava acima de ~100 parâmetros SEM ERRO — 200
 * marcadores devolviam zero linha, e zero linha era lido como "não há nada".
 */
function emBlocos(itens, tamanho = config.lote.parametrosPorBloco) {
  if (!Number.isInteger(tamanho) || tamanho < 1) throw new RangeError('tamanho de bloco inválido');
  const blocos = [];
  for (let i = 0; i < itens.length; i += tamanho) blocos.push(itens.slice(i, i + tamanho));
  return blocos;
}

/**
 * Orçamento de chamadas externas por invocação.
 *
 * EPISÓDIO: o ambiente tinha teto de 1.000 chamadas externas por invocação.
 * Uma escrita por item levou 152 itens a pararem em 15 — e a execução se
 * declarou terminada.
 */
function criarOrcamento({
  teto = config.lote.tetoDeChamadasPorInvocacao,
  margem = config.lote.margemDeSeguranca,
} = {}) {
  const limite = Math.floor(teto * margem);
  let usadas = 0;
  return {
    get usadas() { return usadas; },
    get restantes() { return limite - usadas; },
    limite,
    cabe(n = 1) { return usadas + n <= limite; },
    gastar(n = 1) {
      if (usadas + n > limite) {
        const e = new Error(`orçamento de chamadas esgotado: ${usadas}/${limite}`);
        e.code = 'ORCAMENTO_ESGOTADO';
        throw e;
      }
      usadas += n;
      return usadas;
    },
  };
}

/**
 * Leitura em duas etapas: a segunda não pode derrubar a primeira.
 *
 * EPISÓDIO: campo que o objeto não tem não é ignorado, é RECUSADO. Pedir um
 * campo a mais numa leitura em lote levou o resultado de 11 de 11 para 0 de 11.
 */
async function lerEmEtapas({ ids, etapaBase, etapaExtra }) {
  const base = await etapaBase(ids);
  if (!etapaExtra) return { itens: base, extraOk: true, erroExtra: null };
  try {
    const extra = await etapaExtra(ids);
    const porId = new Map(extra.map((e) => [e.id, e]));
    return {
      itens: base.map((b) => ({ ...b, ...(porId.get(b.id) ?? {}) })),
      extraOk: true,
      erroExtra: null,
    };
  } catch (erro) {
    // A etapa extra falha sozinha. O que já foi lido continua lido.
    return { itens: base, extraOk: false, erroExtra: String(erro.message ?? erro) };
  }
}

/**
 * Marca de conclusão exige ter ACABADO, não ter rodado.
 *
 * EPISÓDIO: uma tarefa se marcou concluída com 15 de 152 itens processados.
 * Os outros 137 ficariam de fora para sempre, com o registro dizendo o
 * contrário.
 */
function marcarConclusao({ processados, total, falhas = 0 }) {
  if (processados > total) throw new RangeError('processados > total');
  if (processados === total && falhas === 0) {
    return { estado: 'concluida', processados, total, pendentes: 0, falhas };
  }
  return {
    estado: 'parcial',
    processados,
    total,
    pendentes: total - processados,
    falhas,
    motivo: falhas > 0 ? 'houve_falhas' : 'itens_nao_processados',
  };
}

module.exports = { emBlocos, criarOrcamento, lerEmEtapas, marcarConclusao };
