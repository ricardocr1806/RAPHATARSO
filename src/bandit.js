'use strict';

/**
 * LINK INTELIGENTE — sorteio do destino.
 *
 * Thompson Sampling sobre Beta(1+conversões, 1+cliques−conversões), com
 * aquecimento, piso e teto de fatia.
 *
 * EPISÓDIO: sem aquecimento o bandit decide com três cliques. O aquecimento não
 * é detalhe: é o que impede o sorteio de eleger um vencedor antes de existir
 * amostra.
 */

const config = require('../config.json');

/**
 * Gamma(k) para k inteiro, pela soma de exponenciais. Determinístico com o
 * `rng` injetado — é isso que torna o sorteio testável.
 */
function gammaInteira(k, rng) {
  let soma = 0;
  for (let i = 0; i < k; i += 1) {
    let u = rng();
    if (u <= 0) u = Number.EPSILON;
    soma -= Math.log(u);
  }
  return soma;
}

/** Normal padrão por Box-Muller, para quando a amostra fica grande. */
function normalPadrao(rng) {
  let u1 = rng();
  if (u1 <= 0) u1 = Number.EPSILON;
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/**
 * Amostra de Beta(a, b) com a e b inteiros. Exato para amostras pequenas;
 * acima de 200 usa aproximação normal — a diferença é irrelevante nesse regime
 * e evita milhares de logaritmos por clique.
 */
function amostrarBeta(a, b, rng) {
  if (a + b <= 200) {
    const x = gammaInteira(a, rng);
    const y = gammaInteira(b, rng);
    return x + y === 0 ? 0.5 : x / (x + y);
  }
  const media = a / (a + b);
  const variancia = (a * b) / ((a + b) ** 2 * (a + b + 1));
  const z = media + normalPadrao(rng) * Math.sqrt(variancia);
  return Math.min(1, Math.max(0, z));
}

/**
 * Escolhe o braço. Durante o aquecimento a divisão é igual — sem isso três
 * cliques elegem um vencedor.
 */
function escolherBraco(bracos, { rng = Math.random, aquecimento = config.bandit.cliquesDeAquecimentoPorBraco } = {}) {
  const ativos = bracos.filter((b) => b.ativo !== false);
  if (ativos.length === 0) throw new Error('nenhum braço ativo: o link nunca pode ficar sem destino');
  if (ativos.length === 1) return { braco: ativos[0], modo: 'unico' };

  const emAquecimento = ativos.filter((b) => b.cliques < aquecimento);
  if (emAquecimento.length > 0) {
    // Divide igual: o menos visto primeiro, desempate estável pelo id.
    const menos = emAquecimento.reduce((a, b) =>
      b.cliques < a.cliques || (b.cliques === a.cliques && b.id < a.id) ? b : a,
    );
    return { braco: menos, modo: 'aquecimento' };
  }

  let melhor = null;
  let melhorAmostra = -1;
  for (const b of ativos) {
    const amostra = amostrarBeta(1 + b.conversoes, 1 + Math.max(0, b.cliques - b.conversoes), rng);
    if (amostra > melhorAmostra) {
      melhorAmostra = amostra;
      melhor = b;
    }
  }
  return { braco: melhor, modo: 'thompson', amostra: melhorAmostra };
}

/**
 * Fatias declaradas para a tela, com piso e teto. Piso existe para que um braço
 * nunca morra sem amostra; teto, para que o vencedor não apague os outros antes
 * da hora.
 */
function fatiasComPisoETeto(pesos, { piso = config.bandit.pisoDeFatia, teto = config.bandit.tetoDeFatia } = {}) {
  const ids = Object.keys(pesos);
  if (ids.length === 0) return {};
  if (piso * ids.length > 1) throw new RangeError('piso alto demais para o número de braços');
  if (teto * ids.length < 1) throw new RangeError('teto baixo demais para o número de braços');

  const total = ids.reduce((s, id) => s + pesos[id], 0);
  const bruto = {};
  for (const id of ids) bruto[id] = total === 0 ? 1 / ids.length : pesos[id] / total;

  // Aplicar piso/teto e depois normalizar devolveria o vencedor para cima do
  // teto. Por isso os limites são fixados e o resto é redistribuído entre os
  // livres, até nenhum limite ser violado.
  const fixos = new Map();
  for (let volta = 0; volta <= ids.length + 2; volta += 1) {
    const livres = ids.filter((id) => !fixos.has(id));
    if (livres.length === 0) break;
    const massaFixa = [...fixos.values()].reduce((s, v) => s + v, 0);
    const restante = 1 - massaFixa;
    const somaLivres = livres.reduce((s, id) => s + bruto[id], 0);
    const candidato = {};
    for (const id of livres) {
      candidato[id] = somaLivres === 0 ? restante / livres.length : (bruto[id] / somaLivres) * restante;
    }
    // Um tipo de violação por volta: fixar teto e piso juntos deixaria massa
    // sobrando (0,8 + 0,05 = 0,85 numa disputa de dois braços).
    const acimaDoTeto = livres.filter((id) => candidato[id] > teto + 1e-12);
    const abaixoDoPiso = livres.filter((id) => candidato[id] < piso - 1e-12);
    if (acimaDoTeto.length === 0 && abaixoDoPiso.length === 0) {
      for (const id of livres) fixos.set(id, candidato[id]);
      break;
    }
    for (const id of acimaDoTeto.length > 0 ? acimaDoTeto : abaixoDoPiso) {
      fixos.set(id, acimaDoTeto.length > 0 ? teto : piso);
    }
  }

  const saida = {};
  for (const id of ids) saida[id] = Number((fixos.get(id) ?? 0).toFixed(6));
  return saida;
}

/**
 * O link de anúncio NUNCA pode devolver erro: é dinheiro entrando numa página
 * branca. Em qualquer exceção, o destino é o controle.
 */
function destinoComRedeDeSeguranca(escolher, controle) {
  try {
    const destino = escolher();
    if (!destino) return { destino: controle, motivo: 'sorteio_sem_destino' };
    return { destino, motivo: null };
  } catch (erro) {
    return { destino: controle, motivo: `excecao_no_sorteio: ${erro.message ?? erro}` };
  }
}

/**
 * EPISÓDIO: rastreador chega com user-agent conhecido — esse se filtra. O que
 * passa (a automação de revisão da Meta chega dos EUA, com fbclid, em rajadas
 * de 19 num minuto) se MOSTRA na tela, não se filtra: recusar um clique de
 * verdade apaga a venda que ele traria, e os dois erros não custam o mesmo.
 * Nunca filtrar por país.
 */
const ROBOS_CONHECIDOS = /(bot|crawler|spider|facebookexternalhit|headlesschrome|python-requests|curl|wget)/i;

function classificarClique({ userAgent = '', pais = null, temFbclid = false }) {
  if (ROBOS_CONHECIDOS.test(userAgent)) {
    return { contar: false, marcar: 'robo_conhecido' };
  }
  if (pais && pais !== 'BR' && temFbclid) {
    // Suspeito, mas CONTA: some na tela como suspeito, não é recusado.
    return { contar: true, marcar: 'suspeito_revisao_da_meta' };
  }
  return { contar: true, marcar: null };
}

module.exports = {
  amostrarBeta,
  escolherBraco,
  fatiasComPisoETeto,
  destinoComRedeDeSeguranca,
  classificarClique,
};
