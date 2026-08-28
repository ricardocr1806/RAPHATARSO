'use strict';

/**
 * FUNIL — medir tela a tela.
 *
 * Todas as contagens aqui são de PESSOA (session_id), nunca de evento: quem
 * volta e avança de novo continua sendo uma.
 */

const config = require('../config.json');

/** Pessoas distintas por tela, na ordem das telas. */
function pessoasPorTela(eventos) {
  const porTela = new Map();
  for (const e of eventos) {
    if (!e.session_id) throw new TypeError('evento sem session_id: não dá para contar pessoa');
    const chave = e.tela_numero;
    if (!porTela.has(chave)) porTela.set(chave, { tela: chave, nome: e.tela_nome, sessoes: new Set() });
    porTela.get(chave).sessoes.add(e.session_id);
  }
  return [...porTela.values()]
    .sort((a, b) => a.tela - b.tela)
    .map((t) => ({ tela: t.tela, nome: t.nome, pessoas: t.sessoes.size }));
}

/**
 * O fim do funil é a última tela COM GENTE.
 *
 * EPISÓDIO: confundir a última tela com gente com a última linha da tabela faz
 * o painel mostrar 0% de conversão para sempre.
 */
function ultimaTelaComGente(telas) {
  const comGente = telas.filter((t) => t.pessoas > 0);
  return comGente.length === 0 ? null : comGente[comGente.length - 1];
}

/**
 * Queda medida contra a tela ANTERIOR.
 *
 * EPISÓDIO: contra a base, toda tela do fim parece igualmente ruim e a tela
 * culpada some no meio. Contra a anterior, a queda aparece onde ela acontece —
 * e o que se encontra é que ela está quase toda no primeiro clique (de 32% a
 * 85% da capa para a primeira pergunta; de lá em diante 0% a 4% por tela).
 */
function quedaContraAnterior(telas) {
  return telas.map((t, i) => {
    if (i === 0) return { ...t, queda: null, contra: null };
    const anterior = telas[i - 1];
    const queda = anterior.pessoas === 0 ? null : 1 - t.pessoas / anterior.pessoas;
    return { ...t, queda: queda === null ? null : Number(queda.toFixed(4)), contra: anterior.tela };
  });
}

/**
 * Braços só se comparam com tráfego do MESMO anúncio.
 *
 * EPISÓDIO: com tráfego misturado uma variante "ganhava" de 66,7% a 39,1%; com
 * tráfego limpo, 64,9% contra 52,0% — e as margens se cobriam. Sem esse filtro
 * o que se compara é público de campanhas diferentes.
 */
function filtrarPorAnuncio(eventos, adId) {
  if (!adId) throw new TypeError('comparar braços sem anúncio é comparar públicos diferentes');
  return eventos.filter((e) => e.ad_id === adId);
}

/** Intervalo de Wilson — honesto com amostra pequena, ao contrário do normal. */
function intervaloWilson(sucessos, total, z = 1.96) {
  if (total === 0) return { taxa: null, min: null, max: null };
  const p = sucessos / total;
  const d = 1 + (z * z) / total;
  const centro = (p + (z * z) / (2 * total)) / d;
  const meia = (z * Math.sqrt((p * (1 - p)) / total + (z * z) / (4 * total * total))) / d;
  return {
    taxa: Number(p.toFixed(4)),
    min: Number(Math.max(0, centro - meia).toFixed(4)),
    max: Number(Math.min(1, centro + meia).toFixed(4)),
  };
}

/**
 * Compara dois braços e diz na cara quando ainda não dá para decidir.
 *
 * EPISÓDIO: com 20 pessoas por braço, 33% contra 29% é sorteio — e uma lista
 * ordenada por taxa convida a matar o segundo colocado.
 */
function compararBracos({ a, b, minimo = config.funil.minimoPorBracoParaComparar }) {
  const ia = intervaloWilson(a.conversoes, a.pessoas);
  const ib = intervaloWilson(b.conversoes, b.pessoas);
  if (a.pessoas < minimo || b.pessoas < minimo) {
    return {
      veredito: 'amostra_insuficiente',
      texto: `menos de ${minimo} pessoas por braço: ainda não dá para decidir`,
      a: ia,
      b: ib,
    };
  }
  const seCobrem = ia.min <= ib.max && ib.min <= ia.max;
  if (seCobrem) {
    return { veredito: 'empate_tecnico', texto: 'empate técnico, ainda não dá para decidir', a: ia, b: ib };
  }
  return {
    veredito: ia.taxa > ib.taxa ? 'a_vence' : 'b_vence',
    texto: `faixas de 95% separadas: ${(ia.taxa * 100).toFixed(1)}% vs ${(ib.taxa * 100).toFixed(1)}%`,
    a: ia,
    b: ib,
  };
}

module.exports = {
  pessoasPorTela,
  ultimaTelaComGente,
  quedaContraAnterior,
  filtrarPorAnuncio,
  intervaloWilson,
  compararBracos,
};
