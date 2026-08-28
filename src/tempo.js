'use strict';

/**
 * FRONTEIRA DE TEMPO
 *
 * A armadilha mais cara e a mais invisível. Nenhuma função deste arquivo
 * usa `new Date(string)` para interpretar data: o parser nativo decide
 * sozinho o formato e erra calado.
 */

/** Fuso que define a fronteira do dia. Quem EMITE o registro define o fuso. */
const FUSO_PADRAO = 'America/Sao_Paulo';

/**
 * Dia operacional de um instante, no fuso de quem emite o registro.
 *
 * EPISÓDIO: cortar o dia em UTC jogava as vendas de 21h-24h para o dia
 * seguinte. 21 vendas apareciam como 8 — uma perda de 62% do dia, sem
 * nenhum erro em lugar nenhum.
 */
function diaOperacional(instante, fuso = FUSO_PADRAO) {
  const data = instante instanceof Date ? instante : new Date(instante);
  if (Number.isNaN(data.getTime())) {
    throw new TypeError(`instante inválido: ${JSON.stringify(instante)}`);
  }
  // 'en-CA' formata como YYYY-MM-DD; o fuso é aplicado ANTES do corte.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: fuso,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(data);
}

/**
 * Converte data brasileira (DD/MM/AAAA) para ISO (AAAA-MM-DD).
 *
 * EPISÓDIO: data brasileira lida como mês-dia devolve null para dia > 12.
 * O bug some nos 12 primeiros dias de todo mês e volta no dia 13 — por isso
 * passou tanto tempo despercebido.
 */
function parseDataBR(texto) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(texto).trim());
  if (!m) throw new TypeError(`data BR inválida: ${JSON.stringify(texto)}`);
  const [, dia, mes, ano] = m;
  const d = Number(dia);
  const mm = Number(mes);
  if (mm < 1 || mm > 12 || d < 1 || d > 31) {
    throw new RangeError(`data BR fora de faixa: ${texto}`);
  }
  return `${ano}-${mes}-${dia}`;
}

/**
 * Recusa comparar duas janelas que não vieram do mesmo fuso.
 *
 * EPISÓDIO: o custo vinha num fuso e a receita em outro. A divisão de um
 * pelo outro tinha aparência de métrica e era comparação de janelas
 * diferentes.
 */
function exigirMesmaJanela(a, b) {
  if (a.fuso !== b.fuso) {
    throw new Error(
      `janelas em fusos diferentes: ${a.rotulo}=${a.fuso} vs ${b.rotulo}=${b.fuso}`,
    );
  }
  if (a.inicio !== b.inicio || a.fim !== b.fim) {
    throw new Error(
      `janelas diferentes: ${a.rotulo}=${a.inicio}..${a.fim} vs ${b.rotulo}=${b.inicio}..${b.fim}`,
    );
  }
  return true;
}

/**
 * Marca uma janela como PARCIAL quando ela inclui o dia corrente.
 *
 * EPISÓDIO: o dia corrente tem 42% dos pagamentos por compensar. Todo custo
 * recente lê mais caro do que vai terminar, e toda decisão tomada sobre ele
 * corta o que ainda ia pagar.
 */
function classificarJanela({ dia, hoje, fracaoPendente = 0.42 }) {
  if (dia > hoje) throw new RangeError(`dia no futuro: ${dia}`);
  if (dia === hoje) {
    return { estado: 'parcial', fracaoPendente, decidivel: false };
  }
  return { estado: 'fechada', fracaoPendente: 0, decidivel: true };
}

module.exports = {
  FUSO_PADRAO,
  diaOperacional,
  parseDataBR,
  exigirMesmaJanela,
  classificarJanela,
};
