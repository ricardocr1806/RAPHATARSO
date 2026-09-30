'use strict';

/**
 * DOUTRINA
 *
 * Toda regra é função PURA e testada, e carrega no comentário o EPISÓDIO que
 * a gerou. Regra que mora só na conversa se perde na próxima sessão.
 *
 * Função pura é o que permite o teste exercitar a decisão real. Quando o teste
 * carrega uma cópia da lógica, a cópia envelhece calada e passa a aprovar o
 * que o sistema já não faz. Nenhum teste deste repositório reimplementa
 * nenhuma função daqui.
 */

const config = require('../config.json');

/**
 * REGRA 1 — A verdade não é média.
 *
 * Quando a fonte de verdade e o painel divergem, o resultado é a fonte de
 * verdade MAIS a divergência declarada. Nunca a média, nunca o arredondamento.
 *
 * EPISÓDIO: a atribuição da plataforma de anúncios inflava de 1,6x a 3,5x e
 * contava o pedido na geração, não no pagamento. Tirar média entre os dois
 * produzia um número que não existia em lugar nenhum — e que ninguém
 * conseguia auditar depois.
 */
function resolverDivergencia({ verdade, painel, tolerancia = config.verdade.divergenciaToleravel }) {
  if (typeof verdade !== 'number' || Number.isNaN(verdade)) {
    throw new TypeError('verdade ausente: sem fonte de verdade não há número');
  }
  const valor = verdade;
  if (typeof painel !== 'number' || Number.isNaN(painel)) {
    return { valor, fonte: 'verdade', divergencia: null, inflacao: null, alerta: 'painel_ausente' };
  }
  const divergencia = verdade === 0 ? (painel === 0 ? 0 : Infinity) : (painel - verdade) / verdade;
  const inflacao = verdade === 0 ? null : painel / verdade;
  const dentroDoEsperado =
    inflacao !== null &&
    inflacao >= config.verdade.inflacaoEsperadaDoPainel.min &&
    inflacao <= config.verdade.inflacaoEsperadaDoPainel.max;
  let alerta = null;
  if (Math.abs(divergencia) > tolerancia) {
    alerta = dentroDoEsperado ? 'inflacao_conhecida_do_painel' : 'divergencia_inexplicada';
  }
  return { valor, fonte: 'verdade', divergencia, inflacao, alerta };
}

/**
 * REGRA 2 — Chave de contagem é a transação, não o pedido.
 *
 * EPISÓDIO: agrupar por order_id conta cada order bump como venda nova:
 * +11% a +20% de receita que não existiu. O erro sobrevive a qualquer
 * revisão porque o total continua "plausível".
 */
function contarUnicos(eventos, { chave = 'transacao_id' } = {}) {
  const vistos = new Set();
  const duplicados = [];
  for (const e of eventos) {
    const id = e?.[chave];
    if (id === undefined || id === null || id === '') {
      throw new TypeError(`evento sem ${chave}: não dá para contar o que não tem identidade`);
    }
    if (vistos.has(id)) duplicados.push(id);
    else vistos.add(id);
  }
  return { total: vistos.size, duplicadosIgnorados: duplicados.length, chave };
}

/**
 * REGRA 3 — Promover exige VOLUME. Cortar exige TEMPO.
 *
 * As duas decisões são assimétricas e não podem compartilhar o mesmo limiar.
 *
 * EPISÓDIO: "menos de 3 resultados = sem dado" protegia um lado só e escondia
 * um caso de 14 dias e 1 resultado. Depois de tempo suficiente, a AUSÊNCIA de
 * resultado É o dado — e o limiar de volume estava impedindo o corte.
 */
function decidir({ resultados, diasAtivo, gasto = 0, janelaDecidivel = true }) {
  if (!janelaDecidivel) {
    return { acao: 'aguardar', motivo: 'janela_parcial' };
  }
  // Promover primeiro: quem já provou volume não é candidato a corte.
  if (
    resultados >= config.promocao.resultadosMinimos &&
    diasAtivo >= config.promocao.diasMinimos
  ) {
    return { acao: 'promover', motivo: `${resultados}_resultados`, exigencia: 'volume' };
  }
  // Corte não exige resultado ZERO: exige TEMPO suficiente com resultado
  // insuficiente. Foi exatamente aqui que o caso de 14 dias e 1 resultado
  // escapava, protegido pelo limiar de volume.
  if (
    diasAtivo >= config.corte.diasMinimosSemResultado &&
    gasto >= config.corte.gastoMinimoSemResultado
  ) {
    return {
      acao: 'cortar',
      motivo: `${resultados}_resultados_em_${diasAtivo}_dias`,
      exigencia: 'tempo',
    };
  }
  return {
    acao: 'aguardar',
    motivo: resultados === 0 ? 'tempo_insuficiente_para_cortar' : 'volume_insuficiente_para_promover',
  };
}

/**
 * REGRA 4 — "Recusada" não pode significar duas coisas.
 *
 * EPISÓDIO: 'recusada' querendo dizer "o dono disse não" e "o sistema barrou"
 * são reações opostas: uma está encerrada, a outra volta sozinha. Com o mesmo
 * nome, a fila reapresentava o que o dono já tinha negado e engolia o que o
 * sistema ia reapresentar.
 */
const ESTADOS_DE_PROPOSTA = Object.freeze({
  PENDENTE: 'pendente',
  APROVADA_PELO_DONO: 'aprovada_pelo_dono',
  NEGADA_PELO_DONO: 'negada_pelo_dono',      // encerrada. Nunca volta.
  BARRADA_PELO_SISTEMA: 'barrada_pelo_sistema', // volta quando a trava soltar.
  EXPIRADA: 'expirada',
  EXECUTADA: 'executada',
});

function ehTerminal(estado) {
  return (
    estado === ESTADOS_DE_PROPOSTA.NEGADA_PELO_DONO ||
    estado === ESTADOS_DE_PROPOSTA.EXECUTADA
  );
}

/**
 * REGRA 5 — Proposta sem resposta expira; expiração é dado, não silêncio.
 *
 * EPISÓDIO: 54% das propostas expiravam sem resposta — 105 de 194 em 7 dias.
 * Foi essa medição, e não uma opinião sobre autonomia, que justificou abrir
 * execução automática para gatilhos específicos.
 */
function avaliarProposta({ estado, criadaEm, agora, expiraEmDias = config.propostas.expiraEmDias }) {
  if (ehTerminal(estado)) return { estado, mudou: false };
  const dias = (new Date(agora) - new Date(criadaEm)) / 86400000;
  if (Number.isNaN(dias)) throw new TypeError('datas inválidas em avaliarProposta');
  if (estado === ESTADOS_DE_PROPOSTA.PENDENTE && dias >= expiraEmDias) {
    return { estado: ESTADOS_DE_PROPOSTA.EXPIRADA, mudou: true, diasSemResposta: dias };
  }
  return { estado, mudou: false, diasSemResposta: dias };
}

/**
 * REGRA 6 — Execução automática é lista fechada, e só do que PARA de gastar.
 *
 * Entra o que interrompe gasto por ausência de resultado. Não entra nada que
 * gaste, nada que dependa de uma média que ainda vai mudar.
 *
 * EPISÓDIO: a autorização veio uma régua por vez, depois de medida. A lista
 * mora em config.json justamente para que ampliá-la seja um ato explícito do
 * dono, não uma inferência do agente.
 */
function podeExecutarSemOK(gatilho, { gasta = false } = {}) {
  const permitidos = config.propostas.gatilhosComExecucaoAutomatica;
  if (gasta) return { permitido: false, motivo: 'gatilho_gasta_dinheiro' };
  if (!permitidos.includes(gatilho)) {
    return { permitido: false, motivo: 'gatilho_nao_autorizado_explicitamente' };
  }
  return { permitido: true, motivo: 'autorizado_um_a_um_pelo_dono' };
}

/**
 * REGRA 7 — Número não conferido não sai daqui.
 *
 * EPISÓDIO: estimativa entregue com cara de medição é indistinguível de
 * medição depois de 24 horas. Se não deu para conferir contra o dado bruto,
 * o campo vai vazio e o motivo vai junto.
 */
function apresentarNumero({ valor, conferidoContra, amostra }) {
  if (!conferidoContra) {
    return { valor: null, apresentavel: false, motivo: 'nao_conferido_contra_dado_bruto' };
  }
  if (!Number.isFinite(valor)) {
    return { valor: null, apresentavel: false, motivo: 'valor_nao_finito' };
  }
  return { valor, apresentavel: true, conferidoContra, amostra: amostra ?? null };
}

/**
 * RECONSTRUIR O CHECKOUT QUANDO A PLATAFORMA NÃO DÁ UM.
 *
 * Episódio 30/09/2026 — `dashboardquiz-db`, 5 quizzes, 1.193 linhas pagas:
 * a plataforma não devolve id de checkout. Ela manda uma transação por ITEM e
 * repete a mesma transação no ciclo de vida. Três armadilhas, todas medidas:
 *
 *   contar LINHA                  912 → inflação de 38% (a mesma transação
 *                                 chega como `approved` e, 7 dias depois,
 *                                 como `completed`, mesmo valor)
 *   contar TRANSAÇÃO              746 → inflação de 13% (o order bump tem
 *                                 transação própria e vira "segunda venda")
 *   contar CHECKOUT               663 → o número certo
 *
 * O bump não é venda: é receita a mais dentro de uma venda que já foi contada.
 * Os 86 bumps da janela tinham TODOS um pedido principal do mesmo comprador em
 * menos de 5 minutos — por isso a cola é comprador + janela de tempo.
 *
 * Bump órfão não é contado como venda nem descartado em silêncio: sai em
 * `achados`, porque item que não encaixa é achado (regra 8).
 */
function agruparEmCheckouts(linhas, {
  janelaSegundos = config.venda.segundosParaBumpColarNoCheckout,
  naoSaoVenda = config.venda.tiposDeItemQueNaoSaoVenda,
} = {}) {
  const achados = [];
  const pagas = [];

  for (const l of linhas) {
    if (!l.transacao_id) {
      throw new TypeError('linha sem transacao_id: sem chave não há como colapsar repetição');
    }
    if (l.pago !== true) continue;
    pagas.push(l);
  }

  // 1. A MESMA transação repetida é uma só. Vale a primeira aparição; o valor
  //    NÃO soma, senão o eco de 7 dias dobraria a receita.
  const porTransacao = new Map();
  for (const l of pagas) {
    const anterior = porTransacao.get(l.transacao_id);
    if (!anterior || String(l.em) < String(anterior.em)) porTransacao.set(l.transacao_id, l);
  }

  const principais = [];
  const bumps = [];
  for (const l of porTransacao.values()) {
    (naoSaoVenda.includes(l.tipo_item) ? bumps : principais).push(l);
  }

  const checkouts = principais
    .map((p) => ({
      checkout_id: p.transacao_id,
      comprador: p.comprador ?? null,
      em: p.em,
      valor: Number(p.valor) || 0,
      itens: 1,
    }))
    .sort((a, b) => String(a.em).localeCompare(String(b.em)));

  // 2. Cada bump entra no checkout do MESMO comprador mais próximo no tempo,
  //    dentro da janela. Soma receita, não soma venda.
  for (const b of bumps) {
    let alvo = null;
    let menorDistancia = Infinity;
    for (const c of checkouts) {
      if (c.comprador == null || c.comprador !== b.comprador) continue;
      const d = Math.abs(new Date(b.em).getTime() - new Date(c.em).getTime()) / 1000;
      if (d <= janelaSegundos && d < menorDistancia) {
        menorDistancia = d;
        alvo = c;
      }
    }
    if (!alvo) {
      achados.push({ tipo: 'bump_sem_checkout', transacao_id: b.transacao_id, comprador: b.comprador ?? null, em: b.em });
      continue;
    }
    alvo.valor += Number(b.valor) || 0;
    alvo.itens += 1;
  }

  return { checkouts, achados };
}

/*
 * ─────────────────────────────────────────────────────────────────────────
 * REGRAS DO SEU DOMÍNIO
 *
 * Vazio de propósito. Na Fase 01 ancoramos a verdade; a partir dela cada
 * regra que você me der em prosa vira uma função AQUI, com o episódio no
 * comentário e um teste que descreve o caso real.
 * ─────────────────────────────────────────────────────────────────────────
 */

module.exports = {
  resolverDivergencia,
  contarUnicos,
  decidir,
  ESTADOS_DE_PROPOSTA,
  ehTerminal,
  avaliarProposta,
  podeExecutarSemOK,
  apresentarNumero,
  agruparEmCheckouts,
};
