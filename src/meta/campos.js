'use strict';

/**
 * CAMPOS DA GRAPH API
 *
 * Campo inválido não é ignorado: derruba a requisição inteira. Por isso a lista
 * é por nível, e a chamada DEGRADA em vez de desistir.
 */

/**
 * EPISÓDIO: `clicks` conta curtida, comentário e "ver mais" — infla o CTR sem
 * ninguém ter ido ao site. O campo que mede visita é `inline_link_clicks`.
 *
 * EPISÓDIO: pedir `campaign_id` no nível de campanha faz a Meta rejeitar a
 * requisição inteira, não só o campo.
 */
const CAMPOS_POR_NIVEL = Object.freeze({
  campanha: ['spend', 'impressions', 'inline_link_clicks', 'campaign_name', 'date_start', 'date_stop'],
  conjunto: ['spend', 'impressions', 'inline_link_clicks', 'adset_name', 'adset_id', 'campaign_id', 'date_start', 'date_stop'],
  anuncio: ['spend', 'impressions', 'inline_link_clicks', 'ad_name', 'ad_id', 'adset_id', 'campaign_id', 'date_start', 'date_stop'],
});

/** Campos que a Meta recusa naquele nível — pedir derruba a requisição inteira. */
const PROIBIDOS_POR_NIVEL = Object.freeze({
  campanha: ['campaign_id', 'adset_id', 'ad_id'],
  conjunto: ['ad_id'],
  anuncio: [],
});

/** Sem estes a linha de gasto não serve para nada; a degradação nunca os corta. */
const ESSENCIAIS = ['spend', 'date_start', 'date_stop'];

/**
 * Lista de campos do nível, mais os que o chamador pedir. É aqui que os pedidos
 * extras são barrados — a trava só serve se algo puder passar por ela.
 */
function camposPara(nivel, { extras = [] } = {}) {
  const campos = CAMPOS_POR_NIVEL[nivel];
  if (!campos) throw new RangeError(`nível desconhecido: ${nivel}`);
  const pedidos = [...campos, ...extras];
  const proibidos = PROIBIDOS_POR_NIVEL[nivel] ?? [];
  const infracao = pedidos.find((c) => proibidos.includes(c));
  if (infracao) {
    throw new Error(`campo proibido no nível ${nivel}: ${infracao} — derruba a requisição inteira`);
  }
  if (pedidos.includes('clicks')) {
    throw new Error('use inline_link_clicks: clicks conta curtida, comentário e "ver mais"');
  }
  return [...new Set(pedidos)];
}

/**
 * Degrada a lista até o mínimo viável. A última tentativa é sempre a que só
 * pede o que sustenta a linha de gasto.
 */
function degradar(campos) {
  const opcionais = campos.filter((c) => !ESSENCIAIS.includes(c));
  const tentativas = [[...campos]];
  for (let corte = 1; corte < opcionais.length; corte += 1) {
    tentativas.push([...ESSENCIAIS, ...opcionais.slice(0, opcionais.length - corte)]);
  }
  tentativas.push([...ESSENCIAIS]);
  return tentativas;
}

/**
 * Busca insights tentando listas cada vez menores. Nunca devolve lista vazia
 * como sucesso: se todas as tentativas falharem, o resultado é falha COM o
 * último erro, para que a tela saiba a diferença entre "não gastou" e
 * "não carregou".
 */
async function buscarInsights({ nivel, chamar }) {
  const tentativas = degradar(camposPara(nivel));
  const erros = [];
  for (const campos of tentativas) {
    try {
      const linhas = await chamar(campos);
      return { ok: true, linhas, camposUsados: campos, tentativas: erros.length + 1, erros };
    } catch (erro) {
      erros.push({ campos: campos.length, erro: String(erro.message ?? erro) });
    }
  }
  return { ok: false, linhas: null, motivo: 'todas_as_listas_de_campos_falharam', erros };
}

/**
 * "Não gastou" e "não carregou" se parecem na tela. O que as separa é
 * `updated_at`.
 */
function estaFresco({ updatedAt, agora, horas = 2 }) {
  if (!updatedAt) {
    return { fresco: false, motivo: 'sem_updated_at', horasSemCarga: null };
  }
  const h = (new Date(agora) - new Date(updatedAt)) / 3600000;
  if (Number.isNaN(h)) return { fresco: false, motivo: 'updated_at_ilegivel', horasSemCarga: null };
  return {
    fresco: h <= horas,
    motivo: h <= horas ? null : 'carga_atrasada',
    horasSemCarga: Number(h.toFixed(2)),
  };
}

module.exports = { CAMPOS_POR_NIVEL, ESSENCIAIS, camposPara, degradar, buscarInsights, estaFresco };
