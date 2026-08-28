#!/usr/bin/env node
'use strict';

/**
 * Rota de auditoria — o comando que responde "isto ainda faz o que promete?".
 *
 * Enquanto o domínio não está ancorado (Fase 01), a única coisa que dá para
 * auditar é o próprio esqueleto. As verificações abaixo são reais: falham
 * de verdade quando o repositório mente sobre si mesmo.
 *
 * Regra desta rota: toda verificação devolve NÚMERO e AÇÃO, exceção é achado,
 * e o resultado é gravado. `persistir` grava em arquivo até existir banco.
 */

const fs = require('node:fs/promises');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { rodarAuditoria, verificarVersaoNoAr } = require('../src/auditoria');
const config = require('../config.json');

const RAIZ = path.join(__dirname, '..');

const verificacoes = [
  {
    nome: 'verdade_ancorada',
    executar: async () => {
      const naoPreenchido = String(config.verdade.fonte).startsWith('<');
      return {
        gravidade: naoPreenchido ? 'critico' : 'ok',
        numero: naoPreenchido ? 0 : 1,
        detalhe: naoPreenchido
          ? 'config.verdade.fonte ainda é um placeholder — nenhum número deste sistema decide nada'
          : `fonte de verdade: ${config.verdade.fonte}`,
        acao: naoPreenchido ? 'rodar a Fase 01 antes de qualquer automação' : 'nenhuma',
      };
    },
  },
  {
    nome: 'doutrina_tem_teste',
    executar: async () => {
      const regras = Object.keys(require('../src/doutrina')).length;
      const testes = (await fs.readFile(path.join(RAIZ, 'test/doutrina.test.js'), 'utf8')).match(/\btest\(/g) || [];
      return {
        gravidade: testes.length >= regras ? 'ok' : 'critico',
        numero: testes.length,
        detalhe: `${regras} exportações da doutrina, ${testes.length} testes`,
        acao: testes.length >= regras ? 'nenhuma' : 'escrever o teste da regra que entrou sem caso real',
      };
    },
  },
  {
    nome: 'regras_que_decidem_tem_teste',
    executar: async () => {
      const { REGRAS_QUE_DECIDEM } = require('../src/regras');
      const testes = (await fs.readFile(path.join(RAIZ, 'test/decisao.test.js'), 'utf8')).match(/\btest\(/g) || [];
      const ok = testes.length >= REGRAS_QUE_DECIDEM.length;
      return {
        gravidade: ok ? 'ok' : 'critico',
        numero: REGRAS_QUE_DECIDEM.length,
        detalhe: `${REGRAS_QUE_DECIDEM.length} regras decidem sozinhas, ${testes.length} testes de decisão`,
        acao: ok ? 'nenhuma' : 'toda regra que decide precisa de um teste com o caso real',
      };
    },
  },
  {
    nome: 'fusos_das_duas_pontas',
    executar: async () => {
      const { conferirFusos } = require('../src/tempo');
      return conferirFusos({
        fusoDaVerdade: config.tempo.fusoDaVerdade,
        fusoDaConta: config.tempo.fusoDaContaDeAnuncio,
        conta: 'padrão',
      });
    },
  },
  {
    nome: 'gasto_conferido_com_o_gerenciador',
    executar: async () => {
      // A única conferência que este repositório NÃO consegue fazer sozinho:
      // ela exige abrir o Gerenciador de Anúncios e comparar com o olho.
      // Enquanto não houver registro, nenhum número daqui foi conferido contra
      // o dado bruto — e a regra 16 diz que ele não vira proposta.
      const destino = path.join(RAIZ, '.conferencias/gerenciador.json');
      let registro;
      try {
        registro = JSON.parse(await fs.readFile(destino, 'utf8'));
      } catch {
        return {
          gravidade: 'critico',
          numero: 0,
          detalhe: 'nenhuma conferência registrada contra o Gerenciador de Anúncios',
          acao: 'conferir o gasto de ontem de 3 campanhas e gravar em .conferencias/gerenciador.json',
        };
      }
      const linhas = Array.isArray(registro.campanhas) ? registro.campanhas : [];
      const divergentes = linhas.filter((l) => Math.abs(l.gasto_sistema - l.gasto_painel) > 0.01);
      return {
        gravidade: linhas.length >= 3 && divergentes.length === 0 ? 'ok' : 'critico',
        numero: linhas.length,
        detalhe: `${linhas.length} campanhas conferidas, ${divergentes.length} divergindo acima de R$ 0,01`,
        acao:
          linhas.length < 3
            ? 'conferir pelo menos 3 campanhas'
            : divergentes.length > 0
              ? `resolver a divergência de ${divergentes.map((d) => d.campanha_id).join(', ')} — nunca arredondar`
              : 'nenhuma',
      };
    },
  },
  {
    nome: 'order_bump_conferido',
    executar: async () => {
      // Também não dá para fazer daqui: exige uma compra de teste real.
      const destino = path.join(RAIZ, '.conferencias/order-bump.json');
      try {
        const r = JSON.parse(await fs.readFile(destino, 'utf8'));
        const ok = r.vendas_contadas === 1 && r.itens_no_checkout >= 2;
        return {
          gravidade: ok ? 'ok' : 'critico',
          numero: r.vendas_contadas,
          detalhe: `compra de teste com ${r.itens_no_checkout} itens contou ${r.vendas_contadas} venda(s)`,
          acao: ok ? 'nenhuma' : 'a chave de contagem não é o checkout — ver ARMADILHAS.md',
        };
      } catch {
        return {
          gravidade: 'critico',
          numero: 0,
          detalhe: 'nenhuma compra de teste com order bump registrada',
          acao: 'fazer uma compra de teste com bump e gravar em .conferencias/order-bump.json',
        };
      }
    },
  },
  {
    nome: 'estado_e_estado_nao_diario',
    executar: async () => {
      const linhas = (await fs.readFile(path.join(RAIZ, 'ESTADO.md'), 'utf8')).split('\n').length;
      return {
        gravidade: linhas > 300 ? 'atencao' : 'ok',
        numero: linhas,
        detalhe: `ESTADO.md com ${linhas} linhas (limite prático: 300; o histórico mora nos commits)`,
        acao: linhas > 300 ? 'reescrever ESTADO.md como estado, cortando o que virou diário' : 'nenhuma',
      };
    },
  },
  {
    nome: 'armadilhas_tem_preco',
    executar: async () => {
      const texto = await fs.readFile(path.join(RAIZ, 'ARMADILHAS.md'), 'utf8');
      const itens = texto.match(/^\*\*Preço:\*\*/gm) || [];
      const semPreco = (texto.match(/^\*\*Preço:\*\* *$/gm) || []).length;
      return {
        gravidade: semPreco === 0 ? 'ok' : 'critico',
        numero: itens.length,
        detalhe: `${itens.length} armadilhas, ${semPreco} sem preço`,
        acao: semPreco === 0 ? 'nenhuma' : 'erro sem número vira folclore — preencher o preço',
      };
    },
  },
  {
    nome: 'versao_no_ar',
    executar: async () => {
      const versaoDoRepo = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: RAIZ })
        .toString()
        .trim();
      // Ainda não há processo no ar: isto é 'atencao' de propósito, e vira
      // 'critico' no dia em que houver deploy e ele ficar para trás.
      const versaoNoAr = process.env.VERSAO_NO_AR || null;
      if (!versaoNoAr) {
        return {
          gravidade: 'atencao',
          numero: 0,
          detalhe: `repo em ${versaoDoRepo}; nenhum processo no ar declarou versão`,
          acao: 'quando houver deploy, expor VERSAO_NO_AR e esta verificação passa a valer',
        };
      }
      return verificarVersaoNoAr({ versaoDoRepo, versaoNoAr });
    },
  },
];

async function persistir(resultado) {
  const destino = path.join(RAIZ, '.auditoria');
  await fs.mkdir(destino, { recursive: true });
  await fs.writeFile(
    path.join(destino, 'ultima.json'),
    JSON.stringify(resultado, null, 2) + '\n',
  );
}

rodarAuditoria(verificacoes, { persistir }).then((r) => {
  for (const a of r.achados) {
    const marca = a.gravidade === 'ok' ? '  ok  ' : a.gravidade === 'atencao' ? ' aten ' : ' CRIT ';
    console.log(`[${marca}] ${a.verificacao} = ${a.numero} · ${a.detalhe}`);
    if (a.gravidade !== 'ok') console.log(`         → ${a.acao}`);
  }
  console.log(`\n${r.total} verificações · ${r.criticos} críticas · ${r.atencao} de atenção · gravado=${r.gravado}`);
  process.exitCode = r.criticos > 0 ? 1 : 0;
});
