'use strict';

/**
 * ESCRITA NA META
 *
 * A Meta responde `{"success":true}` e ignora parâmetro que não suporta. Toda
 * escrita daqui passa por read-back do MESMO campo.
 */

const { escreverComLeitura } = require('../readback');

/** Código de rate limit na LEITURA — não diz nada sobre a escrita. */
const RATE_LIMIT = 17;

/**
 * EPISÓDIO: a Meta responde `17: User request limit reached` na LEITURA depois
 * de a escrita ter passado, e a mensagem parece dizer que nada aconteceu.
 * Refazer a ação por causa dela cria um objeto duplicado. O resultado correto é
 * `escrito_sem_conferir` — e a releitura vem depois, nunca uma reescrita.
 */
async function aplicarNaMeta({ id, campo, valorEsperado, escrever, ler, ...resto }) {
  try {
    const r = await escreverComLeitura({ id, campo, valorEsperado, escrever, ler, ...resto });
    return r;
  } catch (erro) {
    if (codigoDaMeta(erro) === RATE_LIMIT) {
      return {
        ok: null, // nem sucesso nem falha: não foi possível conferir
        motivo: 'escrito_sem_conferir',
        id,
        campo,
        esperado: valorEsperado,
        acao: 'reler mais tarde — NUNCA reescrever, reescrita duplica objeto',
      };
    }
    throw erro;
  }
}

function codigoDaMeta(erro) {
  return erro?.code ?? erro?.error?.code ?? null;
}

/**
 * Recusa criações que a Meta derruba inteiras, e as que custam dinheiro por
 * descuido.
 *
 * EPISÓDIOS:
 * - campanha nasce PAUSADA, sempre: um deploy em propagação criou seis
 *   campanhas de R$ 1.500/dia que ninguém pediu — todas nasceram pausadas,
 *   zero gasto;
 * - orçamento compartilhado junto com orçamento diário derruba a criação;
 * - `url_tags` é campo do CRIATIVO: POST no anúncio responde sucesso e ignora;
 * - `start_time` só na CRIAÇÃO: conjunto criado sem hora começa na hora em que
 *   nasceu, mesmo pausado, e a Meta não edita a hora de quem já começou.
 */
function validarCriacao(payload) {
  const recusas = [];
  if (payload.status !== 'PAUSED') {
    recusas.push('campanha_precisa_nascer_pausada');
  }
  if (payload.daily_budget && payload.lifetime_budget) {
    recusas.push('orcamento_diario_e_vitalicio_juntos_derrubam_a_criacao');
  }
  if (payload.url_tags && payload.nivel === 'anuncio') {
    recusas.push('url_tags_e_do_criativo_nao_do_anuncio');
  }
  if (payload.agendamento && !payload.start_time) {
    recusas.push('start_time_so_existe_na_criacao');
  }
  return { permitido: recusas.length === 0, recusas };
}

/**
 * Ação de escrita é POST, nunca GET.
 *
 * EPISÓDIO: link de ação é clicado por prefetch de navegador e por antivírus
 * corporativo — e cada clique desses é dinheiro mudando de lugar.
 */
function exigirPost(metodo, acao) {
  if (String(metodo).toUpperCase() !== 'POST') {
    throw new Error(`ação de escrita "${acao}" precisa ser POST, veio ${metodo}`);
  }
  return true;
}

module.exports = { aplicarNaMeta, validarCriacao, exigirPost, RATE_LIMIT };
