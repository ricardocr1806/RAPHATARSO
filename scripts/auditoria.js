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
        gravidade: naoPreenchido ? 'atencao' : 'ok',
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
