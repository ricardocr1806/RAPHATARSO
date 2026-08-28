'use strict';

/**
 * READ-BACK
 *
 * Toda escrita é lida de volta, no MESMO campo que foi escrito. Sistemas
 * respondem "sucesso" e ignoram o que não suportam.
 */

const config = require('../config.json');

const dormirPadrao = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Escreve e confere lendo de volta o mesmo campo.
 *
 * EPISÓDIO A (falso alarme): a plataforma tem atraso de leitura-após-escrita.
 * De 6 objetos pausados, um voltou ATIVO na primeira leitura e PAUSADO três
 * segundos depois. Uma leitura só vira alarme falso, e alarme falso ensina a
 * ignorar o alarme. Por isso a segunda tentativa.
 *
 * EPISÓDIO B (o mais caro): um read-back que nunca lia nada respondia "a
 * leitura falhou" em TODA pausa. A ação mais perigosa do sistema era a única
 * sem prova, e passou meses assim porque a mensagem aparecia sempre. Por isso
 * `leitura_vazia` é falha explícita e distinta de `divergencia` — e por isso
 * o resultado carrega o valor lido, não só um booleano.
 */
async function escreverComLeitura({
  id,
  campo,
  valorEsperado,
  escrever,
  ler,
  tentativas = config.readback.tentativas,
  esperaMs = config.readback.esperaEntreTentativasMs,
  dormir = dormirPadrao,
  agora = () => new Date().toISOString(),
}) {
  if (!campo) throw new TypeError('read-back sem campo: leitura em campo diferente não é prova');
  if (typeof escrever !== 'function' || typeof ler !== 'function') {
    throw new TypeError('escrever e ler são obrigatórios');
  }

  const antes = await lerCampo(ler, id, campo);
  const respostaDaEscrita = await escrever();
  const leituras = [];

  for (let tentativa = 1; tentativa <= tentativas; tentativa += 1) {
    if (tentativa > 1) await dormir(esperaMs);
    const lido = await lerCampo(ler, id, campo);
    leituras.push(lido);

    if (lido.estado === 'vazia') continue;
    if (Object.is(lido.valor, valorEsperado)) {
      return {
        ok: true,
        id,
        campo,
        antes: antes.valor ?? null,
        depois: lido.valor,
        tentativasUsadas: tentativa,
        respostaDaEscrita,
        em: agora(),
      };
    }
  }

  const ultima = leituras[leituras.length - 1];
  const motivo = !ultima || ultima.estado === 'vazia' ? 'leitura_vazia' : 'divergencia';
  return {
    ok: false,
    motivo, // 'leitura_vazia' = não houve prova. 'divergencia' = houve prova do contrário.
    id,
    campo,
    antes: antes.valor ?? null,
    esperado: valorEsperado,
    lido: ultima && ultima.estado !== 'vazia' ? ultima.valor : null,
    tentativasUsadas: leituras.length,
    respostaDaEscrita,
    em: agora(),
  };
}

async function lerCampo(ler, id, campo) {
  const objeto = await ler(id);
  if (objeto === null || objeto === undefined) return { estado: 'vazia', valor: null };
  if (!Object.prototype.hasOwnProperty.call(objeto, campo)) {
    // Campo ausente não é "valor diferente": é leitura que não aconteceu.
    return { estado: 'vazia', valor: null };
  }
  const valor = objeto[campo];
  if (valor === undefined) return { estado: 'vazia', valor: null };
  return { estado: 'lida', valor };
}

module.exports = { escreverComLeitura, lerCampo };
