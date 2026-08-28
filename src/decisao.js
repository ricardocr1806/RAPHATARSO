'use strict';

/**
 * O MOTOR.
 *
 * Não decide nada por conta própria: percorre `src/regras.js` na ordem e
 * devolve o primeiro veredito, dizendo QUAL regra decidiu. Se nenhuma decidir,
 * a resposta é MANTER — o padrão é não mexer.
 *
 * A saída daqui é uma PROPOSTA, nunca uma escrita.
 */

const { REGRAS_QUE_DECIDEM, ACOES } = require('./regras');

function decidirCampanha(ctx) {
  exigirContexto(ctx);
  const consultadas = [];
  for (const regra of REGRAS_QUE_DECIDEM) {
    const veredito = regra.avaliar(ctx);
    consultadas.push(regra.id);
    if (veredito) {
      return {
        ...veredito,
        regra: regra.id,
        porque: regra.porque,
        campanha: ctx.campanha.id,
        regrasConsultadas: consultadas,
      };
    }
  }
  return {
    acao: ACOES.MANTER,
    motivo: 'nenhuma_regra_pediu_mudanca',
    regra: null,
    campanha: ctx.campanha.id,
    regrasConsultadas: consultadas,
  };
}

/**
 * Contexto incompleto não vira decisão silenciosa: vira exceção.
 *
 * EPISÓDIO: `undefined` num campo numérico atravessa comparação sem erro e
 * devolve `false` — a decisão sai, errada, e ninguém vê.
 */
function exigirContexto(ctx) {
  const faltando = [];
  if (!ctx || !ctx.campanha || !ctx.campanha.id) faltando.push('campanha.id');
  if (!ctx || !ctx.conta || !Number.isFinite(ctx.conta.tetoDeCustoPorVenda)) {
    faltando.push('conta.tetoDeCustoPorVenda');
  }
  if (!Number.isFinite(ctx?.gastoDoPeriodo)) faltando.push('gastoDoPeriodo');
  if (!Number.isFinite(ctx?.horasDeVida)) faltando.push('horasDeVida');
  if (!Array.isArray(ctx?.diasFechados)) faltando.push('diasFechados');
  if (faltando.length > 0) {
    throw new TypeError(`contexto incompleto: ${faltando.join(', ')}`);
  }
}

/**
 * Uma proposta é o veredito MAIS os números que o sustentam. Proposta sem
 * número não vai para a tela — quem dá OK precisa ver do que está concordando.
 */
function montarProposta({ veredito, numeros, agora }) {
  if (veredito.acao === ACOES.MANTER || veredito.acao === ACOES.IGNORAR) return null;
  if (!numeros || Object.keys(numeros).length === 0) {
    throw new TypeError('proposta sem números que a sustentem');
  }
  return {
    estado: 'pendente',
    criadaEm: agora,
    acao: veredito.acao,
    campanha: veredito.campanha,
    regra: veredito.regra,
    motivo: veredito.motivo,
    porque: veredito.porque,
    numeros,
    executadaEm: null,
    aprovadaPor: null,
  };
}

module.exports = { decidirCampanha, montarProposta, exigirContexto };
