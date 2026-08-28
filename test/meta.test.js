'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { CAMPOS_POR_NIVEL, camposPara, degradar, buscarInsights, estaFresco } = require('../src/meta/campos');
const { aplicarNaMeta, validarCriacao, exigirPost } = require('../src/meta/escrita');

test('a carga mede visita com inline_link_clicks, nunca com clicks', () => {
  for (const nivel of Object.keys(CAMPOS_POR_NIVEL)) {
    assert.ok(camposPara(nivel).includes('inline_link_clicks'), nivel);
    assert.ok(!camposPara(nivel).includes('clicks'), nivel);
  }
});

test('pedir campaign_id no nível de campanha é recusado aqui, antes de a Meta recusar tudo', () => {
  assert.ok(!camposPara('campanha').includes('campaign_id'));
  assert.throws(
    () => camposPara('campanha', { extras: ['campaign_id'] }),
    /campo proibido no nível campanha: campaign_id/,
  );
  // No nível do anúncio o mesmo campo é legítimo.
  assert.ok(camposPara('anuncio', { extras: ['campaign_id'] }).includes('campaign_id'));
});

test('pedir clicks é recusado mesmo como extra: ele conta curtida e comentário', () => {
  assert.throws(() => camposPara('anuncio', { extras: ['clicks'] }), /use inline_link_clicks/);
});

test('ad_id no nível de conjunto também derruba a requisição', () => {
  assert.throws(() => camposPara('conjunto', { extras: ['ad_id'] }), /campo proibido/);
});

test('nível desconhecido não vira lista vazia de campos', () => {
  assert.throws(() => camposPara('conjuntinho'), /nível desconhecido/);
});

test('a degradação nunca corta spend nem as datas', () => {
  const tentativas = degradar(camposPara('anuncio'));
  assert.ok(tentativas.length > 1);
  for (const t of tentativas) {
    assert.ok(t.includes('spend') && t.includes('date_start') && t.includes('date_stop'));
  }
  assert.deepEqual(tentativas.at(-1), ['spend', 'date_start', 'date_stop']);
});

test('chamada que falha com muitos campos volta com menos, em vez de desistir', async () => {
  const r = await buscarInsights({
    nivel: 'anuncio',
    chamar: async (campos) => {
      if (campos.length > 3) throw new Error('(#100) invalid field');
      return [{ spend: '10.00' }];
    },
  });
  assert.equal(r.ok, true);
  assert.deepEqual(r.camposUsados, ['spend', 'date_start', 'date_stop']);
  assert.ok(r.tentativas > 1);
});

test('quando todas as listas falham o resultado é falha, nunca lista vazia', async () => {
  const r = await buscarInsights({
    nivel: 'campanha',
    chamar: async () => {
      throw new Error('rede fora');
    },
  });
  assert.equal(r.ok, false);
  assert.equal(r.linhas, null);
  assert.equal(r.motivo, 'todas_as_listas_de_campos_falharam');
  assert.ok(r.erros.length > 1);
});

test('sem updated_at não dá para dizer "não gastou" — só "não carregou"', () => {
  assert.equal(estaFresco({ updatedAt: null, agora: '2026-08-28T12:00:00Z' }).motivo, 'sem_updated_at');
  const atrasado = estaFresco({ updatedAt: '2026-08-28T06:00:00Z', agora: '2026-08-28T12:00:00Z' });
  assert.equal(atrasado.fresco, false);
  assert.equal(atrasado.horasSemCarga, 6);
  assert.equal(estaFresco({ updatedAt: '2026-08-28T11:00:00Z', agora: '2026-08-28T12:00:00Z' }).fresco, true);
});

test('rate limit na LEITURA devolve escrito_sem_conferir e nunca manda reescrever', async () => {
  const erro = new Error('User request limit reached');
  erro.code = 17;
  const r = await aplicarNaMeta({
    id: 'cmp-1',
    campo: 'daily_budget',
    valorEsperado: '12000',
    escrever: async () => ({ success: true }),
    ler: async () => {
      throw erro;
    },
    dormir: async () => {},
  });
  assert.equal(r.ok, null);
  assert.equal(r.motivo, 'escrito_sem_conferir');
  assert.match(r.acao, /NUNCA reescrever/);
});

test('erro que não é rate limit continua estourando', async () => {
  const erro = new Error('objeto inexistente');
  erro.code = 803;
  await assert.rejects(
    aplicarNaMeta({
      id: 'cmp-1',
      campo: 'daily_budget',
      valorEsperado: '1',
      escrever: async () => ({}),
      ler: async () => {
        throw erro;
      },
    }),
    /objeto inexistente/,
  );
});

test('a Meta responde sucesso e ignora: o read-back é quem decide', async () => {
  const r = await aplicarNaMeta({
    id: 'ad-1',
    campo: 'url_tags',
    valorEsperado: 'utm_source=fb',
    escrever: async () => ({ success: true }), // o sucesso mentiroso
    ler: async () => ({ url_tags: '' }),
    dormir: async () => {},
  });
  assert.equal(r.ok, false);
  assert.equal(r.motivo, 'divergencia');
});

test('campanha que não nasce pausada é recusada antes de existir', () => {
  const r = validarCriacao({ status: 'ACTIVE', daily_budget: 150000 });
  assert.equal(r.permitido, false);
  assert.ok(r.recusas.includes('campanha_precisa_nascer_pausada'));
});

test('orçamento diário junto com vitalício derruba a criação inteira', () => {
  const r = validarCriacao({ status: 'PAUSED', daily_budget: 15000, lifetime_budget: 100000 });
  assert.ok(r.recusas.includes('orcamento_diario_e_vitalicio_juntos_derrubam_a_criacao'));
});

test('url_tags no anúncio é recusado: o campo é do criativo', () => {
  const r = validarCriacao({ status: 'PAUSED', nivel: 'anuncio', url_tags: 'utm_source=fb' });
  assert.ok(r.recusas.includes('url_tags_e_do_criativo_nao_do_anuncio'));
});

test('criação pausada e bem formada passa', () => {
  assert.equal(validarCriacao({ status: 'PAUSED', daily_budget: 15000 }).permitido, true);
});

test('ação de escrita por GET é recusada — prefetch e antivírus clicam sozinhos', () => {
  assert.throws(() => exigirPost('GET', 'pausar_campanha'), /precisa ser POST/);
  assert.equal(exigirPost('post', 'pausar_campanha'), true);
});
