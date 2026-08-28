'use strict';

/**
 * AS REGRAS, COMO DADOS.
 *
 * O motor consulta esta lista; nenhum `if` de decisão mora fora daqui. Cada
 * regra carrega o PORQUÊ — e as que conseguem decidir sozinhas trazem
 * `avaliar(ctx)`, que devolve um veredito ou `null` (não se aplica).
 *
 * As que não têm `avaliar` não são decorativas: são checagens de estrutura que
 * a proposta precisa exibir para quem vai dar OK, e que a auditoria cobra.
 */

const config = require('../config.json');
const { custoPorVenda, custoSeTodoPendentePagar } = require('./vendas');

const ACOES = Object.freeze({
  IGNORAR: 'ignorar',
  INVESTIGAR_CONTA: 'investigar_conta',
  NAO_PROPOR: 'nao_propor',
  MANTER: 'manter',
  ESCALAR: 'escalar',
  REDUZIR: 'reduzir',
  CORTAR: 'cortar',
  CORTAR_EMERGENCIA: 'cortar_emergencia',
});

/** Um dia fechado é caro quando não teve venda, ou passou do teto. */
function diaConfirmaCaro(dia, teto) {
  const c = custoPorVenda({ gasto: dia.gasto, vendas: dia.vendasFront });
  if (c.valor === null) return { caro: true, custo: null, motivo: c.motivo };
  return { caro: c.valor > teto, custo: c.valor, motivo: null };
}

const REGRAS = [
  {
    id: 'R14',
    titulo: 'Campanha de terceiro na mesma conta fica fora de tudo',
    porque: 'Inclusive fora do relatório: um número que não é da operação contamina toda média.',
    avaliar: (ctx) =>
      ctx.campanha.deTerceiro
        ? { acao: ACOES.IGNORAR, motivo: 'campanha_de_terceiro' }
        : null,
  },
  {
    id: 'R10',
    titulo: 'Health check antes de análise',
    porque: 'Gasto zerado pode ser conta desativada, não decisão do algoritmo.',
    avaliar: (ctx) => {
      if (ctx.conta.ativa === false) {
        return { acao: ACOES.INVESTIGAR_CONTA, motivo: 'conta_desativada' };
      }
      if (ctx.gastoDoPeriodo === 0 && ctx.campanha.status === 'ACTIVE') {
        return { acao: ACOES.INVESTIGAR_CONTA, motivo: 'campanha_ativa_sem_gasto' };
      }
      return null;
    },
  },
  {
    id: 'R16',
    titulo: 'Número não conferido não vira proposta',
    porque: 'Divergência entre fontes se RESOLVE, não se arredonda.',
    avaliar: (ctx) =>
      ctx.numerosConferidos === true
        ? null
        : { acao: ACOES.NAO_PROPOR, motivo: 'numeros_nao_conferidos' },
  },
  {
    id: 'RE',
    titulo: 'Corte de emergência',
    porque:
      'Única decisão que escapa da regra dos dois dias fechados: gastou o teto e não gerou venda em fonte NENHUMA — nem na verdade, nem no painel que infla.',
    avaliar: (ctx) => {
      const limite = ctx.conta.tetoDeCustoPorVenda * config.decisao.corteDeEmergencia.multiploDoTetoSemVenda;
      if (ctx.gastoDoPeriodo >= limite && ctx.vendasEmQualquerFonte === 0 && limite > 0) {
        return {
          acao: ACOES.CORTAR_EMERGENCIA,
          motivo: `gastou_${ctx.gastoDoPeriodo}_sem_venda_em_fonte_nenhuma`,
        };
      }
      return null;
    },
  },
  {
    id: 'R09',
    titulo: 'Learning phase se respeita',
    porque:
      'Campanha com menos de 48h é MANTER por definição. Julgar antes disso é julgar o aprendizado, não o criativo.',
    avaliar: (ctx) =>
      ctx.horasDeVida < config.decisao.horasDeLearningPhase
        ? { acao: ACOES.MANTER, motivo: `learning_phase_${ctx.horasDeVida}h` }
        : null,
  },
  {
    id: 'R2D',
    titulo: 'A regra dos dois dias fechados',
    porque:
      'Diminuir ou cortar exige que os DOIS dias fechados anteriores confirmem. O dia corrente nunca conta: 42% dos checkouts dele ainda estão pendentes (ontem 10%, anteontem 5%). Antes de cortar, a campanha precisa continuar cara mesmo que todo pendente pague.',
    avaliar: (ctx) => {
      const teto = ctx.conta.tetoDeCustoPorVenda;
      const fechados = ctx.diasFechados.slice(0, config.decisao.diasFechadosParaReduzirOuCortar);
      if (fechados.length < config.decisao.diasFechadosParaReduzirOuCortar) {
        return { acao: ACOES.MANTER, motivo: 'dias_fechados_insuficientes' };
      }
      const vereditos = fechados.map((d) => diaConfirmaCaro(d, teto));
      if (!vereditos.every((v) => v.caro)) return null;

      // O cenário otimista é obrigatório: se todo pendente pagar, ainda é caro?
      const gasto = fechados.reduce((s, d) => s + d.gasto, 0);
      const pagas = fechados.reduce((s, d) => s + d.vendasFront, 0);
      const pendentes = fechados.reduce((s, d) => s + (d.vendasFrontPendentes ?? 0), 0);
      const cenario = custoSeTodoPendentePagar({ gasto, vendasPagas: pagas, vendasPendentes: pendentes });
      if (cenario.otimista.valor !== null && cenario.otimista.valor <= teto) {
        return {
          acao: ACOES.MANTER,
          motivo: `barata_se_pendentes_pagarem_${cenario.otimista.valor}`,
          numeros: cenario,
        };
      }
      const semVendaNenhuma = pagas === 0 && pendentes === 0;
      return {
        acao: semVendaNenhuma ? ACOES.CORTAR : ACOES.REDUZIR,
        motivo: semVendaNenhuma
          ? 'dois_dias_fechados_sem_venda'
          : `dois_dias_fechados_acima_do_teto_${cenario.atual.valor}`,
        numeros: cenario,
      };
    },
  },
  {
    id: 'R08',
    titulo: 'Escala de +20% a +30%, no máximo uma vez por dia por campanha',
    porque:
      'Acima de ~20% a Meta reinicia o aprendizado e a campanha volta para a fase cara que já tinha pago para sair.',
    avaliar: (ctx) => {
      const teto = ctx.conta.tetoDeCustoPorVenda;
      const fechados = ctx.diasFechados.slice(0, config.decisao.diasFechadosParaReduzirOuCortar);
      if (fechados.length === 0) return null;
      const todosBaratos = fechados.every((d) => {
        const v = diaConfirmaCaro(d, teto);
        return v.custo !== null && !v.caro;
      });
      if (!todosBaratos) return null;
      if (ctx.escalouHoje) {
        return { acao: ACOES.MANTER, motivo: 'ja_escalou_hoje' };
      }
      const custoAtual = custoPorVenda({
        gasto: fechados.reduce((s, d) => s + d.gasto, 0),
        vendas: fechados.reduce((s, d) => s + d.vendasFront, 0),
      });
      return {
        acao: ACOES.ESCALAR,
        motivo: `dois_dias_fechados_abaixo_do_teto_${custoAtual.valor}`,
        percentual: config.decisao.escala.minimo,
        orcamentoProposto: Number(
          (ctx.campanha.orcamentoDiario * (1 + config.decisao.escala.minimo)).toFixed(2),
        ),
      };
    },
  },

  // ── Regras de estrutura: não decidem sozinhas, mas a proposta as exibe e a
  // auditoria as cobra. Estão aqui, e não num documento, porque regra que mora
  // só na conversa se perde na próxima sessão.
  { id: 'R01', titulo: 'Nada executa sem OK explícito', porque: '"Analisa" e "bora otimizar" pedem proposta, não ação.' },
  { id: 'R02', titulo: 'Campanha boa: só se mexe em orçamento', porque: 'Criativo, público e otimização ficam quietos.' },
  { id: 'R03', titulo: 'Recriar, não editar', porque: 'Mudança estrutural nasce em campanha nova ao lado.' },
  { id: 'R04', titulo: 'Público padrão é Advantage+ aberto', porque: 'Interesse e lookalike são anomalias que precisam de justificativa.' },
  { id: 'R05', titulo: 'Teste de criativo: 3 conjuntos idênticos em ABO', porque: 'Sem isso o orçamento escolhe o vencedor antes do criativo.' },
  { id: 'R06', titulo: 'Toda campanha otimiza compra com o pixel da oferta', porque: 'Lead só se pedido.' },
  { id: 'R07', titulo: 'Idade mínima definida, sem exceção', porque: 'Sem ela a entrega vaza para fora do público que paga.' },
  { id: 'R11', titulo: 'Cada operação é separada', porque: 'Nunca misturar contas, pixels e checkouts.' },
  { id: 'R12', titulo: 'Nunca agregar sem qualificar', porque: 'Toda linha carrega dono e tipo.' },
  { id: 'R13', titulo: 'UTM padrão definido, com o macro no campo certo', porque: 'url_tags é campo do CRIATIVO; no anúncio a Meta responde sucesso e ignora.' },
  { id: 'R15', titulo: 'Escala se julga pela JORNADA', porque: 'Nunca só pelo custo do ingresso: quem compra o front e depois o principal muda a conta inteira.' },
];

const REGRAS_QUE_DECIDEM = REGRAS.filter((r) => typeof r.avaliar === 'function');

function regraPorId(id) {
  const r = REGRAS.find((x) => x.id === id);
  if (!r) throw new RangeError(`regra inexistente: ${id}`);
  return r;
}

module.exports = { REGRAS, REGRAS_QUE_DECIDEM, ACOES, regraPorId, diaConfirmaCaro };
