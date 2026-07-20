const { Prisma } = require('@prisma/client');

const { prisma } = require('../config/prisma');
const { HttpError } = require('../utils/httpError');
const { aiInsightsService } = require('./aiInsights.service');

const MOTIVOS_DEFEITO = [
  'Sinal Alto',
  'Conector com defeito',
  'Quedas do WIFI',
  'Alcance da rede WIFI',
  'Não sobe internet',
  'Danificado',
  'Travado',
  'Sem problemas, apenas troca',
  'Não passa banda contratada',
  'Reiniciando',
  'Porta WAN não passa banda correta',
  'Aumentando DBM',
  'Acoplador com problema',
  'Velocidade',
  'Teste Ping',
  'Suporte não conseguiu acessar',
  'Diferença de DBM',
  'Luz da WAN não ascende',
  'ONU travada',
  'ONU não provisiona',
  'Problema na configuração',
  'Rede 2.4 muito lenta',
  'Acoplador',
  'Quedas de Sinal',
  'Apenas Recolhimento',
  'Lentidão',
  'Não tem cadastro no Elleven',
  'Migração',
  'Sem acesso',
  'Não aparece rede 5G',
  'Perca de dBm',
  'Fonte Queimada',
  'ONU em LOS',
  'Wi-Fi passando pouca internet',
  'Não aparece Wi-Fi',
  'Não conecta na rede via cabo',
  'Fica se descofigurando',
  'Não encontra na OLT',
  'Desligando',
  'Sinal de retorno alto',
  'Ligando apenas o Power',
  'CPU Alto',
  'Não liga',
  'Não reseta',
  'Acoplador quebrado',
  'Luz da internet não ascende',
  'Rede 5G não conecta',
  'Desconectando',
  'Não aparece o SN no OLT'
];

const MOTIVOS_DESCARTE = [
  'Queimado',
  'Parte exterior amarelada',
  'Parte exterior com tinta',
  'Antena quebrada',
  'Porta LAN queimada',
  'Quebrada',
  'Porta WAN queimada',
  'Antena danificada',
  'Botão reset quebrado'
];

const dashboardService = {
  async getMetrics(filters = {}) {
    const where = buildWhere(filters);

    const [
      overview,
      equipamentosPorModelo,
      motivosDefeito,
      motivosDescarte,
      produtividadePorResponsavel,
      equipamentosPorCidade,
      atendimentosPorEquipe,
      evolucaoPorMes,
      anosEvolucao
    ] = await Promise.all([
      getOverview(where),
      getEquipamentosPorModelo(where),
      getTopMotivosByList(where, MOTIVOS_DEFEITO),
      getTopMotivosByList(where, MOTIVOS_DESCARTE),
      getProdutividadePorResponsavel(where),
      getEquipamentosPorCidade(where),
      getAtendimentosPorEquipe(where),
      getEvolucaoPorMes(where, filters),
      getAnosEvolucao(filters)
    ]);

    return {
      filtros: normalizeFilters(filters),
      resumo: overview,
      equipamentosPorModelo,
      motivosDefeito,
      motivosDescarte,
      produtividadePorResponsavel,
      equipamentosPorCidade,
      atendimentosPorEquipe,
      evolucaoPorMes,
      anosEvolucao
    };
  },

  async getVendas(filters = {}) {
    const where = appendCondition(buildWhere(filters), Prisma.sql`e."situacao_final" = 'VENDA' AND e."venda_confirmada" = true`);

    const [
      resumo,
      modelosMaisVendidos,
      vendasPorMes,
      compradores
    ] = await Promise.all([
      getResumoVendas(where),
      getModelosMaisVendidos(where),
      getVendasPorMes(where),
      getCompradoresVendas(filters)
    ]);

    return {
      filtros: normalizeFilters(filters),
      resumo,
      modeloMaisVendido: modelosMaisVendidos[0] || null,
      modelosMaisVendidos,
      mesComMaisVendas: vendasPorMes[0] || null,
      vendasPorMes: [...vendasPorMes].sort((a, b) => a.mes.localeCompare(b.mes)),
      compradores
    };
  },

  async getEquipamentosLaboratorio(filters = {}) {
    const where = buildLabEquipmentWhere(filters);

    const rows = await prisma.$queryRaw`
      SELECT
        e."modelo" AS "modelo",
        COALESCE(SUM(e."quantidade"), 0)::int AS "quantidade",
        COUNT(*)::int AS "registros"
      FROM "equipamentos" e
      ${where}
      GROUP BY e."modelo"
      HAVING COALESCE(SUM(e."quantidade"), 0) > 0
      ORDER BY "quantidade" DESC, e."modelo" ASC
    `;

    return normalizeRows(rows);
  },

  async getRelatorioDiario(filters = {}) {
    const normalized = normalizeReportFilters(filters);
    const where = buildDailyReportWhere(normalized);

    const [
      overview,
      situacoes,
      modelos,
      motivos,
      cidades,
      equipes,
      vendasPorModelo
    ] = await Promise.all([
      getOverview(where),
      getSituacoesRelatorio(where),
      getModelosRelatorio(where),
      getMotivosRelatorio(where),
      getCidadesRelatorio(where),
      getEquipesRelatorio(where),
      getVendasPorModeloRelatorio(where)
    ]);

    const vendas = getResumoVendasFromRows(vendasPorModelo);
    const resumo = {
      ...overview,
      totalVendas: vendas.quantidade,
      valorVendido: vendas.valor
    };

    const reportPayload = {
      periodo: {
        dataInicial: normalized.dataInicial,
        dataFinal: normalized.dataFinal
      },
      resumo,
      situacoes,
      modelos,
      motivos,
      cidades,
      equipes,
      vendasPorModelo
    };
    const fallbackInsights = buildReportInsights(reportPayload);
    const insights = await aiInsightsService.generateReportInsights(
      buildAiReportPayload(reportPayload),
      fallbackInsights
    );

    return {
      dataInicial: normalized.dataInicial,
      dataFinal: normalized.dataFinal,
      data: normalized.dataInicial,
      geradoEm: new Date().toISOString(),
      resumo,
      situacoes,
      modelos,
      motivos,
      cidades,
      equipes,
      vendasPorModelo,
      insights
    };
  },

  async exportRelatorioDiarioCsv(filters = {}) {
    const normalized = normalizeReportFilters(filters);

    const rows = await prisma.$queryRaw`
      SELECT
        e."data_finalizacao" AS "dataFinalizacao",
        e."modelo",
        e."quantidade",
        e."origem",
        e."numero_serie" AS "numeroSerie",
        e."equipe",
        e."protocolo",
        e."cidade",
        e."status",
        e."situacao_final" AS "situacaoFinal",
        e."motivo",
        e."valor_venda" AS "valorVenda",
        e."comprador_venda" AS "compradorVenda",
        e."documento_comprador_venda" AS "documentoCompradorVenda",
        e."venda_confirmada" AS "vendaConfirmada",
        e."resolvido",
        u."nome" AS "responsavel",
        e."observacoes",
        e."criado_em" AS "criadoEm",
        e."atualizado_em" AS "atualizadoEm"
      FROM "equipamentos" e
      INNER JOIN "usuarios" u ON u."id" = e."responsavel_id"
      WHERE e."ativo" = true
        AND e."data_finalizacao" >= ${normalized.start}
        AND e."data_finalizacao" <= ${normalized.end}
      ORDER BY e."data_finalizacao" ASC, e."modelo" ASC
    `;

    return toReportCsv(normalizeRows(rows));
  },

  async exportCsv(filters = {}) {
    const where = buildWhere(filters);

    const rows = await prisma.$queryRaw`
      SELECT
        e."criado_em" AS "criadoEm",
        e."data_finalizacao" AS "dataFinalizacao",
        e."modelo",
        e."quantidade",
        e."origem",
        e."numero_serie" AS "numeroSerie",
        e."equipe",
        e."cidade",
        e."status",
        e."situacao_final" AS "situacaoFinal",
        e."motivo",
        e."comprador_venda" AS "compradorVenda",
        e."documento_comprador_venda" AS "documentoCompradorVenda",
        e."venda_confirmada" AS "vendaConfirmada",
        e."resolvido",
        u."nome" AS "responsavel"
      FROM "equipamentos" e
      INNER JOIN "usuarios" u ON u."id" = e."responsavel_id"
      ${where}
      ORDER BY COALESCE(e."data_finalizacao", e."criado_em") DESC, e."criado_em" DESC
    `;

    return toCsv(rows);
  }
};

async function getOverview(where) {
  const rows = await prisma.$queryRaw`
    SELECT
      COUNT(*)::int AS "totalRegistros",
      COALESCE(SUM(e."quantidade"), 0)::int AS "totalEquipamentos",
      COALESCE(SUM(e."quantidade") FILTER (
        WHERE e."origem" = 'CAIXA_OS'
          AND e."status" = 'EM_TESTE'
          AND e."situacao_final" IN ('REAPROVEITADO', 'RMA')
          AND e."resolvido" IS NOT NULL
      ), 0)::int AS "totalCaixaOs",
      COALESCE(SUM(e."quantidade") FILTER (
        WHERE e."origem" = 'CAIXA_OS'
          AND e."status" = 'EM_TESTE'
          AND e."situacao_final" IN ('REAPROVEITADO', 'RMA')
          AND e."resolvido" = true
      ), 0)::int AS "caixaOsResolvidos",
      COALESCE(SUM(e."quantidade") FILTER (WHERE e."situacao_final" = 'DESCARTE'), 0)::int AS "totalDescartes",
      COALESCE(SUM(e."quantidade") FILTER (WHERE e."situacao_final" = 'RMA'), 0)::int AS "totalRma",
      COALESCE(SUM(e."quantidade") FILTER (WHERE e."situacao_final" = 'REAPROVEITADO'), 0)::int AS "totalReaproveitados",
      ROUND(
        CASE
          WHEN COALESCE(SUM(e."quantidade") FILTER (
            WHERE e."origem" = 'CAIXA_OS'
              AND e."status" = 'EM_TESTE'
              AND e."situacao_final" IN ('REAPROVEITADO', 'RMA')
              AND e."resolvido" IS NOT NULL
          ), 0) = 0 THEN 0
          ELSE (COALESCE(SUM(e."quantidade") FILTER (
            WHERE e."origem" = 'CAIXA_OS'
              AND e."status" = 'EM_TESTE'
              AND e."situacao_final" IN ('REAPROVEITADO', 'RMA')
              AND e."resolvido" = true
          ), 0)::numeric * 100)
            / COALESCE(SUM(e."quantidade") FILTER (
              WHERE e."origem" = 'CAIXA_OS'
                AND e."status" = 'EM_TESTE'
                AND e."situacao_final" IN ('REAPROVEITADO', 'RMA')
                AND e."resolvido" IS NOT NULL
            ), 0)
        END,
        2
      )::float AS "taxaResolucao",
      ROUND(
        CASE
          WHEN COALESCE(SUM(e."quantidade"), 0) = 0 THEN 0
          ELSE (COALESCE(SUM(e."quantidade") FILTER (WHERE e."situacao_final" = 'DESCARTE'), 0)::numeric * 100)
            / COALESCE(SUM(e."quantidade"), 0)
        END,
        2
      )::float AS "taxaDescarte"
      ,
      ROUND(
        CASE
          WHEN COALESCE(SUM(e."quantidade"), 0) = 0 THEN 0
          ELSE (COALESCE(SUM(e."quantidade") FILTER (WHERE e."situacao_final" = 'REAPROVEITADO'), 0)::numeric * 100)
            / COALESCE(SUM(e."quantidade"), 0)
        END,
        2
      )::float AS "taxaReaproveitamento",
      ROUND(
        CASE
          WHEN COALESCE(SUM(e."quantidade"), 0) = 0 THEN 0
          ELSE (COALESCE(SUM(e."quantidade") FILTER (WHERE e."situacao_final" = 'RMA'), 0)::numeric * 100)
            / COALESCE(SUM(e."quantidade"), 0)
        END,
        2
      )::float AS "taxaRma"
    FROM "equipamentos" e
    INNER JOIN "usuarios" u ON u."id" = e."responsavel_id"
    ${where}
  `;

  return rows[0] || emptyOverview();
}

async function getEquipamentosPorModelo(where) {
  const rows = await prisma.$queryRaw`
    SELECT
      e."modelo" AS "label",
      COALESCE(SUM(e."quantidade"), 0)::int AS "quantidade",
      COUNT(*)::int AS "registros"
    FROM "equipamentos" e
    INNER JOIN "usuarios" u ON u."id" = e."responsavel_id"
    ${where}
    GROUP BY e."modelo"
    ORDER BY "quantidade" DESC, e."modelo" ASC
    LIMIT 6
  `;

  return normalizeRows(rows);
}

async function getTopMotivosByList(where, allowedMotivos) {
  const rows = await prisma.$queryRaw`
    SELECT
      e."motivo" AS "label",
      COALESCE(SUM(e."quantidade"), 0)::int AS "quantidade",
      COUNT(*)::int AS "registros"
    FROM "equipamentos" e
    INNER JOIN "usuarios" u ON u."id" = e."responsavel_id"
    ${appendCondition(where, Prisma.sql`e."motivo" IS NOT NULL AND TRIM(e."motivo") <> ''`)}
    GROUP BY e."motivo"
    ORDER BY "quantidade" DESC, e."motivo" ASC
  `;

  const allowed = new Set(allowedMotivos.map(normalizeText));

  return normalizeRows(rows)
    .filter((row) => allowed.has(normalizeText(row.label)))
    .slice(0, 5);
}

async function getProdutividadePorResponsavel(where) {
  const rows = await prisma.$queryRaw`
    SELECT
      u."nome" AS "label",
      u."id" AS "responsavelId",
      COUNT(*)::int AS "registros",
      COALESCE(SUM(e."quantidade"), 0)::int AS "quantidade"
    FROM "equipamentos" e
    INNER JOIN "usuarios" u ON u."id" = e."responsavel_id"
    ${where}
    GROUP BY u."id", u."nome"
    ORDER BY "registros" DESC, u."nome" ASC
    LIMIT 15
  `;

  return normalizeRows(rows);
}

async function getEquipamentosPorCidade(where) {
  const rows = await prisma.$queryRaw`
    SELECT
      TRIM(e."cidade") AS "label",
      COALESCE(SUM(e."quantidade"), 0)::int AS "quantidade",
      COUNT(*)::int AS "registros"
    FROM "equipamentos" e
    INNER JOIN "usuarios" u ON u."id" = e."responsavel_id"
    ${appendCondition(where, Prisma.sql`e."cidade" IS NOT NULL AND TRIM(e."cidade") <> ''`)}
    GROUP BY TRIM(e."cidade")
    ORDER BY "quantidade" DESC, "label" ASC
    LIMIT 15
  `;

  return normalizeRows(rows);
}

async function getSituacoesRelatorio(where) {
  const rows = await prisma.$queryRaw`
    SELECT
      e."situacao_final" AS "label",
      COUNT(*)::int AS "registros",
      COALESCE(SUM(e."quantidade"), 0)::int AS "quantidade"
    FROM "equipamentos" e
    INNER JOIN "usuarios" u ON u."id" = e."responsavel_id"
    ${where}
    GROUP BY e."situacao_final"
    ORDER BY "quantidade" DESC, e."situacao_final" ASC
  `;

  return normalizeRows(rows);
}

async function getModelosRelatorio(where) {
  const rows = await prisma.$queryRaw`
    SELECT
      e."modelo" AS "label",
      COUNT(*)::int AS "registros",
      COALESCE(SUM(e."quantidade"), 0)::int AS "quantidade"
    FROM "equipamentos" e
    INNER JOIN "usuarios" u ON u."id" = e."responsavel_id"
    ${where}
    GROUP BY e."modelo"
    ORDER BY "quantidade" DESC, e."modelo" ASC
    LIMIT 10
  `;

  return normalizeRows(rows);
}

async function getMotivosRelatorio(where) {
  const rows = await prisma.$queryRaw`
    SELECT
      TRIM(e."motivo") AS "label",
      COUNT(*)::int AS "registros",
      COALESCE(SUM(e."quantidade"), 0)::int AS "quantidade"
    FROM "equipamentos" e
    INNER JOIN "usuarios" u ON u."id" = e."responsavel_id"
    ${appendCondition(where, Prisma.sql`e."motivo" IS NOT NULL AND TRIM(e."motivo") <> ''`)}
    GROUP BY TRIM(e."motivo")
    ORDER BY "quantidade" DESC, "label" ASC
    LIMIT 10
  `;

  return normalizeRows(rows);
}

async function getCidadesRelatorio(where) {
  const rows = await prisma.$queryRaw`
    SELECT
      TRIM(e."cidade") AS "label",
      COUNT(*)::int AS "registros",
      COALESCE(SUM(e."quantidade"), 0)::int AS "quantidade"
    FROM "equipamentos" e
    INNER JOIN "usuarios" u ON u."id" = e."responsavel_id"
    ${appendCondition(where, Prisma.sql`e."cidade" IS NOT NULL AND TRIM(e."cidade") <> ''`)}
    GROUP BY TRIM(e."cidade")
    ORDER BY "quantidade" DESC, "label" ASC
    LIMIT 10
  `;

  return normalizeRows(rows);
}

async function getEquipesRelatorio(where) {
  const rows = await prisma.$queryRaw`
    SELECT
      TRIM(e."equipe") AS "label",
      COUNT(*)::int AS "registros",
      COALESCE(SUM(e."quantidade"), 0)::int AS "quantidade"
    FROM "equipamentos" e
    INNER JOIN "usuarios" u ON u."id" = e."responsavel_id"
    ${appendCondition(where, Prisma.sql`e."equipe" IS NOT NULL AND TRIM(e."equipe") <> ''`)}
    GROUP BY TRIM(e."equipe")
    ORDER BY "registros" DESC, "quantidade" DESC, "label" ASC
    LIMIT 10
  `;

  return normalizeRows(rows);
}

async function getVendasPorModeloRelatorio(where) {
  const rows = await prisma.$queryRaw`
    SELECT
      e."modelo" AS "label",
      COUNT(*)::int AS "registros",
      COALESCE(SUM(e."quantidade"), 0)::int AS "quantidade",
      COALESCE(SUM(e."quantidade" * e."valor_venda"), 0)::float AS "valorVendido"
    FROM "equipamentos" e
    INNER JOIN "usuarios" u ON u."id" = e."responsavel_id"
    ${appendCondition(where, Prisma.sql`e."situacao_final" = 'VENDA' AND e."venda_confirmada" = true`)}
    GROUP BY e."modelo"
    ORDER BY "quantidade" DESC, "valorVendido" DESC, e."modelo" ASC
    LIMIT 10
  `;

  return normalizeRows(rows);
}

async function getAtendimentosPorEquipe(where) {
  const rows = await prisma.$queryRaw`
    SELECT
      TRIM(e."equipe") AS "label",
      COUNT(*)::int AS "registros",
      COALESCE(SUM(e."quantidade"), 0)::int AS "quantidade"
    FROM "equipamentos" e
    INNER JOIN "usuarios" u ON u."id" = e."responsavel_id"
    ${appendCondition(where, Prisma.sql`e."equipe" IS NOT NULL AND TRIM(e."equipe") <> ''`)}
    GROUP BY TRIM(e."equipe")
    ORDER BY "registros" DESC, "quantidade" DESC, "label" ASC
  `;

  return normalizeRows(rows);
}

async function getResumoVendas(where) {
  const rows = await prisma.$queryRaw`
    SELECT
      COUNT(*)::int AS "registros",
      COALESCE(SUM(e."quantidade"), 0)::int AS "quantidadeVendida",
      COALESCE(SUM(e."quantidade" * e."valor_venda"), 0)::float AS "valorVendido"
    FROM "equipamentos" e
    INNER JOIN "usuarios" u ON u."id" = e."responsavel_id"
    ${where}
  `;

  return rows[0] || {
    registros: 0,
    quantidadeVendida: 0,
    valorVendido: 0
  };
}

async function getModelosMaisVendidos(where) {
  const rows = await prisma.$queryRaw`
    SELECT
      e."modelo" AS "label",
      COUNT(*)::int AS "registros",
      COALESCE(SUM(e."quantidade"), 0)::int AS "quantidade",
      COALESCE(SUM(e."quantidade" * e."valor_venda"), 0)::float AS "valorVendido"
    FROM "equipamentos" e
    INNER JOIN "usuarios" u ON u."id" = e."responsavel_id"
    ${where}
    GROUP BY e."modelo"
    ORDER BY "quantidade" DESC, "valorVendido" DESC, e."modelo" ASC
  `;

  return normalizeRows(rows);
}

async function getVendasPorMes(where) {
  const rows = await prisma.$queryRaw`
    SELECT
      TO_CHAR(DATE_TRUNC('month', COALESCE(e."data_finalizacao", e."criado_em")), 'YYYY-MM') AS "mes",
      COUNT(*)::int AS "registros",
      COALESCE(SUM(e."quantidade"), 0)::int AS "quantidade",
      COALESCE(SUM(e."quantidade" * e."valor_venda"), 0)::float AS "valorVendido"
    FROM "equipamentos" e
    INNER JOIN "usuarios" u ON u."id" = e."responsavel_id"
    ${where}
    GROUP BY DATE_TRUNC('month', COALESCE(e."data_finalizacao", e."criado_em"))
    ORDER BY "valorVendido" DESC, "quantidade" DESC, "mes" ASC
  `;

  return normalizeRows(rows);
}

async function getCompradoresVendas(filters = {}) {
  const filtersWithoutComprador = {
    ...filters,
    comprador: null
  };
  const where = appendCondition(
    buildWhere(filtersWithoutComprador),
    Prisma.sql`e."situacao_final" = 'VENDA' AND e."venda_confirmada" = true AND e."comprador_venda" IS NOT NULL AND TRIM(e."comprador_venda") <> ''`
  );

  const rows = await prisma.$queryRaw`
    SELECT DISTINCT
      TRIM(e."comprador_venda") AS "nome"
    FROM "equipamentos" e
    INNER JOIN "usuarios" u ON u."id" = e."responsavel_id"
    ${where}
    ORDER BY "nome" ASC
  `;

  return normalizeRows(rows).map((row) => row.nome);
}

async function getEvolucaoPorMes(where, filters = {}) {
  const range = getEvolutionRange(filters);
  const evolutionWhere = appendCondition(
    where,
    Prisma.sql`COALESCE(e."data_finalizacao", e."criado_em") >= ${range.start} AND COALESCE(e."data_finalizacao", e."criado_em") < ${range.endExclusive}`
  );

  const rows = await prisma.$queryRaw`
    SELECT
      TO_CHAR(DATE_TRUNC('month', COALESCE(e."data_finalizacao", e."criado_em")), 'YYYY-MM') AS "mes",
      COUNT(*)::int AS "registros",
      COALESCE(SUM(e."quantidade"), 0)::int AS "quantidade",
      COALESCE(SUM(e."quantidade") FILTER (WHERE e."situacao_final" = 'REAPROVEITADO'), 0)::int AS "reaproveitados",
      COALESCE(SUM(e."quantidade") FILTER (WHERE e."situacao_final" = 'DESCARTE'), 0)::int AS "descartes",
      COALESCE(SUM(e."quantidade") FILTER (WHERE e."situacao_final" = 'RMA'), 0)::int AS "rma"
    FROM "equipamentos" e
    INNER JOIN "usuarios" u ON u."id" = e."responsavel_id"
    ${evolutionWhere}
    GROUP BY DATE_TRUNC('month', COALESCE(e."data_finalizacao", e."criado_em"))
    ORDER BY DATE_TRUNC('month', COALESCE(e."data_finalizacao", e."criado_em")) ASC
  `;

  return normalizeRows(rows);
}

async function getAnosEvolucao(filters = {}) {
  const yearFilters = {
    ...filters,
    dataInicial: null,
    dataFinal: null,
    evolucaoAno: null
  };
  const where = buildWhere(yearFilters);

  const rows = await prisma.$queryRaw`
    SELECT DISTINCT
      EXTRACT(YEAR FROM COALESCE(e."data_finalizacao", e."criado_em"))::int AS "ano"
    FROM "equipamentos" e
    INNER JOIN "usuarios" u ON u."id" = e."responsavel_id"
    ${where}
    ORDER BY "ano" DESC
  `;

  return normalizeRows(rows).map((row) => row.ano);
}

function buildWhere(filters) {
  const normalized = normalizeFilters(filters);
  const conditions = [Prisma.sql`e."ativo" = true`];

  if (normalized.dataInicial) {
    conditions.push(Prisma.sql`COALESCE(e."data_finalizacao", e."criado_em") >= ${normalized.dataInicial}`);
  }

  if (normalized.dataFinal) {
    conditions.push(Prisma.sql`COALESCE(e."data_finalizacao", e."criado_em") <= ${normalized.dataFinal}`);
  }

  appendTextListCondition(conditions, Prisma.sql`e."cidade"`, normalized.cidade);
  appendTextListCondition(conditions, Prisma.sql`e."equipe"`, normalized.equipe);
  appendEnumListCondition(conditions, Prisma.sql`e."origem"`, normalized.origem, 'OrigemEquipamento');

  if (normalized.responsavelId) {
    conditions.push(Prisma.sql`e."responsavel_id" = ${normalized.responsavelId}::uuid`);
  }

  appendTextListCondition(conditions, Prisma.sql`u."nome"`, normalized.responsavel);

  appendTextListCondition(conditions, Prisma.sql`e."modelo"`, normalized.modelo);
  appendTextListCondition(conditions, Prisma.sql`e."modelo"`, normalized.fabricante);
  appendTextListCondition(conditions, Prisma.sql`e."modelo"`, normalized.categoria);

  if (normalized.tipo === 'ANTENA') {
    conditions.push(Prisma.sql`(e."modelo" ILIKE 'Antena%' OR e."modelo" ILIKE 'Rádio%' OR e."modelo" ILIKE 'Radio%')`);
  }

  if (normalized.tipo === 'OUTROS') {
    conditions.push(Prisma.sql`NOT (e."modelo" ILIKE 'Antena%' OR e."modelo" ILIKE 'Rádio%' OR e."modelo" ILIKE 'Radio%')`);
  }

  appendTextListCondition(conditions, Prisma.sql`e."comprador_venda"`, normalized.comprador);

  appendTextListCondition(conditions, Prisma.sql`e."motivo"`, normalized.motivo);

  if (normalized.resolvido === 'true') {
    conditions.push(Prisma.sql`e."resolvido" = true`);
  }

  if (normalized.resolvido === 'false') {
    conditions.push(Prisma.sql`e."resolvido" = false`);
  }

  appendEnumListCondition(conditions, Prisma.sql`e."status"`, normalized.status, 'StatusEquipamento');
  appendEnumListCondition(conditions, Prisma.sql`e."situacao_final"`, normalized.situacaoFinal, 'SituacaoFinal');

  return Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`;
}

function buildLabEquipmentWhere(filters = {}) {
  const normalized = {
    dataInicial: parseDate(filters.dataInicial, 'dataInicial', false),
    dataFinal: parseDate(filters.dataFinal, 'dataFinal', true),
    modelo: clean(filters.modelo),
    fabricante: clean(filters.fabricante),
    categoria: clean(filters.categoria),
    tipo: clean(filters.tipo),
    situacaoFinal: clean(filters.situacaoFinal)
  };
  const conditions = [Prisma.sql`e."ativo" = true`];

  if (normalized.dataInicial) {
    conditions.push(Prisma.sql`COALESCE(e."data_finalizacao", e."criado_em") >= ${normalized.dataInicial}`);
  }

  if (normalized.dataFinal) {
    conditions.push(Prisma.sql`COALESCE(e."data_finalizacao", e."criado_em") <= ${normalized.dataFinal}`);
  }

  if (normalized.dataInicial && normalized.dataFinal && normalized.dataInicial > normalized.dataFinal) {
    throw new HttpError(400, 'Data inicial nao pode ser maior que a data final.');
  }

  appendTextListCondition(conditions, Prisma.sql`e."modelo"`, normalized.modelo);
  appendTextListCondition(conditions, Prisma.sql`e."modelo"`, normalized.fabricante);
  appendTextListCondition(conditions, Prisma.sql`e."modelo"`, normalized.categoria);

  if (normalized.tipo === 'ANTENA') {
    conditions.push(Prisma.sql`(e."modelo" ILIKE 'Antena%' OR e."modelo" ILIKE 'Rádio%' OR e."modelo" ILIKE 'Radio%')`);
  }

  if (normalized.tipo === 'OUTROS') {
    conditions.push(Prisma.sql`NOT (e."modelo" ILIKE 'Antena%' OR e."modelo" ILIKE 'Rádio%' OR e."modelo" ILIKE 'Radio%')`);
  }

  appendEnumListCondition(conditions, Prisma.sql`e."situacao_final"`, normalized.situacaoFinal, 'SituacaoFinal');

  return Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`;
}

function buildDailyReportWhere(filters) {
  return Prisma.sql`WHERE ${Prisma.join([
    Prisma.sql`e."ativo" = true`,
    Prisma.sql`e."data_finalizacao" >= ${filters.start}`,
    Prisma.sql`e."data_finalizacao" <= ${filters.end}`
  ], ' AND ')}`;
}

function appendCondition(whereSql, conditionSql) {
  return Prisma.sql`${whereSql} AND ${conditionSql}`;
}

function appendTextListCondition(conditions, fieldSql, value) {
  const values = parseList(value);
  if (values.length === 0) return;

  conditions.push(Prisma.sql`(${Prisma.join(
    values.map((item) => Prisma.sql`${fieldSql} ILIKE ${`%${item}%`}`),
    ' OR '
  )})`);
}

function appendEnumListCondition(conditions, fieldSql, value, enumName) {
  const values = parseList(value);
  if (values.length === 0) return;

  const enumValues = values.map((item) => Prisma.sql`${item}::${Prisma.raw(`"${enumName}"`)}`);
  conditions.push(Prisma.sql`${fieldSql} IN (${Prisma.join(enumValues)})`);
}

function parseList(value) {
  if (!value) return [];
  const values = Array.isArray(value) ? value : String(value).split(',');
  return values.map((item) => String(item).trim()).filter(Boolean);
}

function normalizeReportFilters(filters = {}) {
  const dataInicial = clean(filters.dataInicial) || clean(filters.data);
  const dataFinal = clean(filters.dataFinal) || dataInicial;

  if (!dataInicial || !dataFinal) {
    throw new HttpError(400, 'Data inicial e data final do relatorio sao obrigatorias.');
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataInicial) || !/^\d{4}-\d{2}-\d{2}$/.test(dataFinal)) {
    throw new HttpError(400, 'Data invalida. Use o formato YYYY-MM-DD.');
  }

  const start = parseDate(dataInicial, 'dataInicial', false);
  const end = parseDate(dataFinal, 'dataFinal', true);

  if (start > end) {
    throw new HttpError(400, 'Data inicial nao pode ser maior que a data final.');
  }

  return { dataInicial, dataFinal, start, end };
}

function normalizeFilters(filters) {
  const normalized = {
    dataInicial: parseDate(filters.dataInicial, 'dataInicial', false),
    dataFinal: parseDate(filters.dataFinal, 'dataFinal', true),
    cidade: clean(filters.cidade),
    equipe: clean(filters.equipe),
    origem: clean(filters.origem),
    responsavel: clean(filters.responsavel),
    responsavelId: clean(filters.responsavelId),
    modelo: clean(filters.modelo),
    fabricante: clean(filters.fabricante),
    categoria: clean(filters.categoria),
    tipo: clean(filters.tipo),
    comprador: clean(filters.comprador),
    motivo: clean(filters.motivo),
    evolucaoAno: clean(filters.evolucaoAno),
    resolvido: clean(filters.resolvido),
    status: clean(filters.status),
    situacaoFinal: clean(filters.situacaoFinal)
  };

  if (normalized.dataInicial && normalized.dataFinal && normalized.dataInicial > normalized.dataFinal) {
    throw new HttpError(400, 'Data inicial nao pode ser maior que a data final.');
  }

  return normalized;
}

function getEvolutionRange(filters = {}) {
  const normalized = normalizeFilters(filters);
  const year = Number.parseInt(normalized.evolucaoAno, 10);

  if (Number.isInteger(year) && year >= 2000 && year <= 2100) {
    return {
      start: new Date(`${year}-01-01T00:00:00.000`),
      endInclusive: new Date(`${year}-12-01T00:00:00.000`),
      endExclusive: new Date(`${year + 1}-01-01T00:00:00.000`)
    };
  }

  if (normalized.dataInicial || normalized.dataFinal) {
    const start = normalized.dataInicial || startOfMonth(addMonths(new Date(), -11));
    const endInclusive = startOfMonth(normalized.dataFinal || new Date());

    return {
      start: startOfMonth(start),
      endInclusive,
      endExclusive: addMonths(endInclusive, 1)
    };
  }

  const currentMonth = startOfMonth(new Date());
  const start = addMonths(currentMonth, -11);

  return {
    start,
    endInclusive: currentMonth,
    endExclusive: addMonths(currentMonth, 1)
  };
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date, amount) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function parseDate(value, field, endOfDay) {
  if (!value) return null;

  const date = new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}`);

  if (Number.isNaN(date.getTime())) {
    throw new HttpError(400, `${field} invalida. Use o formato YYYY-MM-DD.`);
  }

  return date;
}

function clean(value) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized || null;
}

function normalizeText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function normalizeRows(rows) {
  return rows.map((row) => {
    const normalized = {};

    for (const [key, value] of Object.entries(row)) {
      normalized[key] = typeof value === 'bigint' ? Number(value) : value;
    }

    return normalized;
  });
}

function toCsv(rows) {
  const headers = [
    'criadoEm',
    'dataFinalizacao',
    'modelo',
    'quantidade',
    'origem',
    'numeroSerie',
    'equipe',
    'cidade',
    'status',
    'situacaoFinal',
    'motivo',
    'compradorVenda',
    'documentoCompradorVenda',
    'vendaConfirmada',
    'resolvido',
    'responsavel'
  ];

  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => escapeCsv(row[header])).join(','))
  ];

  return lines.join('\n');
}

function toReportCsv(rows) {
  const headers = [
    'Data',
    'Modelo',
    'QTD',
    'Origem',
    'SN',
    'Equipe',
    'Protocolo',
    'Cidade',
    'Status',
    'Situacao Final',
    'Motivo',
    'Valor Unitario Venda',
    'Valor Total Venda',
    'Comprador',
    'CPF/CNPJ Comprador',
    'Venda Confirmada',
    'Resolvido',
    'Responsavel',
    'Observacoes',
    'Criado Em',
    'Atualizado Em'
  ];

  const lines = [
    headers.join(','),
    ...rows.map((row) => [
      formatCsvDate(row.dataFinalizacao),
      row.modelo,
      row.quantidade,
      row.origem,
      row.numeroSerie,
      row.equipe,
      row.protocolo,
      row.cidade,
      row.status,
      row.situacaoFinal,
      row.motivo,
      row.valorVenda,
      calculateSaleTotal(row),
      row.compradorVenda,
      row.documentoCompradorVenda,
      row.vendaConfirmada ? 'Sim' : 'Nao',
      row.resolvido === null || row.resolvido === undefined ? '' : row.resolvido ? 'Sim' : 'Nao',
      row.responsavel,
      row.observacoes,
      formatCsvDateTime(row.criadoEm),
      formatCsvDateTime(row.atualizadoEm)
    ].map(escapeCsv).join(','))
  ];

  return lines.join('\n');
}

function escapeCsv(value) {
  if (value === undefined || value === null) return '';
  const normalized = value instanceof Date ? value.toISOString() : String(value);
  return `"${normalized.replaceAll('"', '""')}"`;
}

function calculateSaleTotal(row) {
  if (row.valorVenda === null || row.valorVenda === undefined || row.valorVenda === '') return '';
  return Number(row.valorVenda || 0) * Number(row.quantidade || 0);
}

function formatCsvDate(value) {
  if (!value) return '';
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
}

function formatCsvDateTime(value) {
  if (!value) return '';
  return value instanceof Date ? value.toISOString() : String(value);
}

function getResumoVendasFromRows(rows) {
  return rows.reduce((acc, row) => ({
    quantidade: acc.quantidade + Number(row.quantidade || 0),
    valor: acc.valor + Number(row.valorVendido || 0)
  }), { quantidade: 0, valor: 0 });
}

function buildAiReportPayload(payload) {
  return {
    periodo: payload.periodo,
    resumo: payload.resumo,
    rankings: {
      situacoes: limitRows(payload.situacoes),
      modelos: limitRows(payload.modelos),
      motivos: limitRows(payload.motivos),
      cidades: limitRows(payload.cidades),
      equipes: limitRows(payload.equipes),
      vendasPorModelo: limitRows(payload.vendasPorModelo)
    },
    observacaoPrivacidade: 'Payload contem somente dados agregados; nao inclui SN, protocolo, comprador ou registros individuais.'
  };
}

function limitRows(rows) {
  return (rows || []).slice(0, 10).map((row) => ({
    label: row.label,
    quantidade: row.quantidade,
    registros: row.registros,
    valorVendido: row.valorVendido
  }));
}

function buildReportInsights({ periodo, resumo, modelos, motivos, cidades, equipes, vendasPorModelo }) {
  const total = Number(resumo.totalEquipamentos || 0);
  const periodoTexto = periodo?.dataInicial === periodo?.dataFinal
    ? `No dia ${formatDateForText(periodo.dataInicial)}`
    : `No periodo de ${formatDateForText(periodo.dataInicial)} a ${formatDateForText(periodo.dataFinal)}`;

  if (total === 0) {
    return {
      executivo: `${periodoTexto}, nao houve equipamentos finalizados.`,
      pontosPositivos: [],
      oportunidades: ['Manter o acompanhamento diario para identificar rapidamente dias sem processamento registrado.'],
      destaques: []
    };
  }

  const topModelo = modelos[0];
  const topMotivo = motivos[0];
  const topCidade = cidades[0];
  const topEquipe = equipes[0];
  const topVenda = vendasPorModelo[0];
  const pontosPositivos = [];
  const oportunidades = [];
  const destaques = [];

  if (topModelo) {
    destaques.push(`O modelo com maior volume foi ${topModelo.label}, com ${topModelo.quantidade} equipamento(s).`);
  }

  if (topMotivo) {
    destaques.push(`O motivo mais recorrente foi ${topMotivo.label}, somando ${topMotivo.quantidade} equipamento(s).`);
  }

  if (topEquipe) {
    destaques.push(`A equipe com maior numero de atendimentos foi ${topEquipe.label}, com ${topEquipe.registros} registro(s).`);
  }

  if (topCidade) {
    destaques.push(`A cidade mais recorrente foi ${topCidade.label}, com ${topCidade.quantidade} equipamento(s).`);
  }

  if (topVenda) {
    destaques.push(`Nas vendas, o principal modelo foi ${topVenda.label}, com ${topVenda.quantidade} unidade(s) vendida(s).`);
  }

  if (Number(resumo.taxaReaproveitamento || 0) >= 60) {
    pontosPositivos.push(`O reaproveitamento ficou em ${formatPercent(resumo.taxaReaproveitamento)}, indicando boa recuperacao dos equipamentos processados.`);
  }

  if (Number(resumo.taxaResolucao || 0) >= 70) {
    pontosPositivos.push(`A taxa de resolucao ficou em ${formatPercent(resumo.taxaResolucao)}, um resultado positivo para os casos elegiveis de Caixa de OS.`);
  }

  if (Number(resumo.totalVendas || 0) > 0) {
    pontosPositivos.push(`Foram registradas ${resumo.totalVendas} unidade(s) vendida(s), totalizando ${formatCurrency(resumo.valorVendido)}.`);
  }

  if (Number(resumo.taxaDescarte || 0) >= 25) {
    oportunidades.push(`A taxa de descarte ficou em ${formatPercent(resumo.taxaDescarte)}. Recomenda-se avaliar os principais motivos de falha e descarte.`);
  }

  if (Number(resumo.taxaRma || 0) >= 20) {
    oportunidades.push(`A taxa de RMA ficou em ${formatPercent(resumo.taxaRma)}. Pode haver padrao de falha tecnica ou lote que merece acompanhamento.`);
  }

  if (Number(resumo.taxaResolucao || 0) < 50 && Number(resumo.totalCaixaOs || 0) > 0) {
    oportunidades.push(`A taxa de resolucao ficou em ${formatPercent(resumo.taxaResolucao)}. Recomenda-se revisar diagnostico, testes e preenchimento do campo resolvido.`);
  }

  if (topCidade && total > 0 && Number(topCidade.quantidade || 0) / total >= 0.35) {
    oportunidades.push(`A cidade ${topCidade.label} concentrou parte relevante dos registros. Vale acompanhar possiveis recorrencias operacionais nessa localidade.`);
  }

  if (topMotivo && total > 0 && Number(topMotivo.quantidade || 0) / total >= 0.25) {
    oportunidades.push(`O motivo ${topMotivo.label} concentrou muitos casos. Uma analise tecnica especifica pode reduzir reincidencias.`);
  }

  if (pontosPositivos.length === 0) {
    pontosPositivos.push('Os registros do dia foram consolidados e estao disponiveis para acompanhamento dos indicadores operacionais.');
  }

  if (oportunidades.length === 0) {
    oportunidades.push('Nao foram identificados alertas criticos pelos criterios automaticos. Manter o acompanhamento dos indicadores nos proximos dias.');
  }

  const executivo = `${periodoTexto}, foram processados ${total} equipamento(s) em ${resumo.totalRegistros || 0} registro(s). O reaproveitamento foi de ${formatPercent(resumo.taxaReaproveitamento)}, o descarte de ${formatPercent(resumo.taxaDescarte)} e o RMA de ${formatPercent(resumo.taxaRma)}.`;

  return {
    executivo,
    pontosPositivos,
    oportunidades,
    destaques
  };
}

function formatPercent(value) {
  return `${Number(value || 0).toLocaleString('pt-BR')}%`;
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function formatDateForText(value) {
  if (!value) return '-';
  const [year, month, day] = String(value).split('-');
  return `${day}/${month}/${year}`;
}

function emptyOverview() {
  return {
    totalRegistros: 0,
    totalEquipamentos: 0,
    totalCaixaOs: 0,
    caixaOsResolvidos: 0,
    totalDescartes: 0,
    totalRma: 0,
    totalReaproveitados: 0,
    taxaResolucao: 0,
    taxaDescarte: 0,
    taxaReaproveitamento: 0,
    taxaRma: 0
  };
}

module.exports = { dashboardService };
