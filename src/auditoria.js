'use strict';

/**
 * AUDITORIA QUE AUDITA A SI MESMA
 *
 * Este tipo de sistema não quebra: ele continua respondendo com dado velho,
 * pela metade, ou de uma fonte que parou. A auditoria existe para perguntar
 * "isto ainda faz o que promete?" — e para não conseguir mentir que sim.
 *
 * Três invariantes:
 *   1. Toda verificação traz NÚMERO e AÇÃO. Alarme sem número não mede nada.
 *   2. Exceção dentro de um bloco É um achado. Leitura que não aconteceu nunca
 *      pode ser reportada como boa notícia.
 *   3. O resultado é gravado. Auditoria que só aparece na tela não existe
 *      depois que a aba fecha.
 */

const GRAVIDADES = Object.freeze(['ok', 'atencao', 'critico']);

/**
 * EPISÓDIO: bloco de auditoria com catch que engolia exceção virava "nenhum
 * problema encontrado". A auditoria mais silenciosa era a que estava quebrada.
 */
async function rodarAuditoria(verificacoes, { persistir, agora = () => new Date().toISOString() } = {}) {
  const achados = [];

  for (const v of verificacoes) {
    try {
      const r = await v.executar();
      if (r === null || r === undefined || !Number.isFinite(r.numero)) {
        achados.push({
          verificacao: v.nome,
          gravidade: 'critico',
          numero: null,
          detalhe: 'verificação não devolveu número — não é possível saber se passou',
          acao: `corrigir a verificação ${v.nome} para devolver um número`,
        });
        continue;
      }
      if (!GRAVIDADES.includes(r.gravidade)) {
        throw new TypeError(`gravidade inválida: ${r.gravidade}`);
      }
      achados.push({ verificacao: v.nome, ...r });
    } catch (erro) {
      // Nunca engolido: a falha do bloco é o achado.
      achados.push({
        verificacao: v.nome,
        gravidade: 'critico',
        numero: null,
        detalhe: `falha_de_bloco: ${erro && erro.message ? erro.message : String(erro)}`,
        acao: `a verificação ${v.nome} não rodou — trate como não verificado, não como ok`,
      });
    }
  }

  const resultado = {
    em: agora(),
    total: achados.length,
    criticos: achados.filter((a) => a.gravidade === 'critico').length,
    atencao: achados.filter((a) => a.gravidade === 'atencao').length,
    achados,
    gravado: false,
  };

  if (typeof persistir === 'function') {
    try {
      await persistir(resultado);
      resultado.gravado = true;
    } catch (erro) {
      resultado.gravado = false;
      resultado.erroAoGravar = String(erro && erro.message ? erro.message : erro);
      resultado.criticos += 1;
      resultado.achados.push({
        verificacao: 'gravacao_da_auditoria',
        gravidade: 'critico',
        numero: null,
        detalhe: `auditoria rodou mas não foi gravada: ${resultado.erroAoGravar}`,
        acao: 'sem gravação não há histórico — corrigir a persistência',
      });
    }
  }

  return resultado;
}

/**
 * Batimento é o que o sistema DIZ de si; dado é o que ele FEZ.
 * Quando discordam, quem tem razão é o dado.
 *
 * EPISÓDIO: uma fonte ficou 10h fora do ar com o batimento verde. Outra
 * congelou a tabela de gasto por 4h no pico, com a etapa "rodando" e voltando
 * zero linha.
 */
function compararBatimentoComDado({
  batimentoOk,
  ultimoDadoEm,
  agora,
  toleranciaHoras = 1,
  nome = 'fonte',
}) {
  const horasSemDado = (new Date(agora) - new Date(ultimoDadoEm)) / 3600000;
  if (Number.isNaN(horasSemDado)) {
    return {
      gravidade: 'critico',
      numero: null,
      detalhe: `${nome}: não foi possível ler a data do último dado`,
      acao: 'tratar como não verificado',
    };
  }
  if (horasSemDado <= toleranciaHoras) {
    return {
      gravidade: 'ok',
      numero: Number(horasSemDado.toFixed(2)),
      detalhe: `${nome}: dado fresco há ${horasSemDado.toFixed(2)}h`,
      acao: 'nenhuma',
    };
  }
  return {
    gravidade: 'critico',
    numero: Number(horasSemDado.toFixed(2)),
    detalhe: batimentoOk
      ? `${nome}: batimento VERDE e ${horasSemDado.toFixed(2)}h sem dado novo — o dado tem razão`
      : `${nome}: ${horasSemDado.toFixed(2)}h sem dado novo`,
    acao: `reprocessar ${nome} e não decidir nada com esta fonte até voltar`,
  };
}

/**
 * Contagem que voltou zero não é "nada encontrado": é leitura suspeita até
 * prova em contrário.
 *
 * EPISÓDIO: zero linha por teto silencioso de parâmetros era indistinguível
 * de zero linha por ausência real de dado.
 */
function avaliarContagem({ linhas, esperadoMinimo = 1, nome = 'consulta' }) {
  if (linhas > 0) {
    return { gravidade: 'ok', numero: linhas, detalhe: `${nome}: ${linhas} linhas`, acao: 'nenhuma' };
  }
  return {
    gravidade: esperadoMinimo > 0 ? 'critico' : 'atencao',
    numero: 0,
    detalhe: `${nome}: zero linha — pode ser ausência real ou leitura que não aconteceu`,
    acao: `conferir ${nome} contra o dado bruto antes de concluir que não há nada`,
  };
}

/**
 * Commit no repositório não é código no ar.
 *
 * EPISÓDIO: uma trava entrou no arquivo e no dia seguinte a varredura achou
 * dois objetos violando ela — o processo no ar era mais velho que o commit.
 * Commit sem deploy é uma mentira com data.
 */
function verificarVersaoNoAr({ versaoDoRepo, versaoNoAr }) {
  if (!versaoNoAr) {
    return {
      gravidade: 'critico',
      numero: 0,
      detalhe: 'o processo no ar não informa versão — não dá para saber o que está rodando',
      acao: 'expor a versão no processo em execução',
    };
  }
  const igual = versaoDoRepo === versaoNoAr;
  return {
    gravidade: igual ? 'ok' : 'critico',
    numero: igual ? 1 : 0,
    detalhe: igual
      ? `no ar: ${versaoNoAr}`
      : `repo=${versaoDoRepo} mas no ar=${versaoNoAr} — as regras novas não estão valendo`,
    acao: igual ? 'nenhuma' : 'fazer o deploy antes de confiar em qualquer regra recente',
  };
}

module.exports = {
  rodarAuditoria,
  compararBatimentoComDado,
  avaliarContagem,
  verificarVersaoNoAr,
  GRAVIDADES,
};
