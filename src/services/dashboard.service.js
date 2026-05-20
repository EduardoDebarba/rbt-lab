const { Prisma } = require('@prisma/client');

const { prisma } = require('../config/prisma');
const { HttpError } = require('../utils/httpError');

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
      evolucaoPorMes
    ] = await Promise.all([
      getOverview(where),
      getEquipamentosPorModelo(where),
      getTopMotivosByList(where, MOTIVOS_DEFEITO),
      getTopMotivosByList(where, MOTIVOS_DESCARTE),
      getProdutividadePorResponsavel(where),
      getEquipamentosPorCidade(where),
      getEvolucaoPorMes(where)
    ]);

    return {
      filtros: normalizeFilters(filters),
      resumo: overview,
      equipamentosPorModelo,
      motivosDefeito,
      motivosDescarte,
      produtividadePorResponsavel,
      equipamentosPorCidade,
      evolucaoPorMes
    };
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
      COALESCE(SUM(e."quantidade") FILTER (WHERE e."origem" = 'CAIXA_OS'), 0)::int AS "totalCaixaOs",
      COALESCE(SUM(e."quantidade") FILTER (WHERE e."origem" = 'CAIXA_OS' AND e."resolvido" = true), 0)::int AS "caixaOsResolvidos",
      COALESCE(SUM(e."quantidade") FILTER (WHERE e."situacao_final" = 'DESCARTE'), 0)::int AS "totalDescartes",
      COALESCE(SUM(e."quantidade") FILTER (WHERE e."situacao_final" = 'RMA'), 0)::int AS "totalRma",
      COALESCE(SUM(e."quantidade") FILTER (WHERE e."situacao_final" = 'REAPROVEITADO'), 0)::int AS "totalReaproveitados",
      ROUND(
        CASE
          WHEN COALESCE(SUM(e."quantidade") FILTER (WHERE e."origem" = 'CAIXA_OS'), 0) = 0 THEN 0
          ELSE (COALESCE(SUM(e."quantidade") FILTER (WHERE e."origem" = 'CAIXA_OS' AND e."resolvido" = true), 0)::numeric * 100)
            / COALESCE(SUM(e."quantidade") FILTER (WHERE e."origem" = 'CAIXA_OS'), 0)
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

async function getEvolucaoPorMes(where) {
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
    ${where}
    GROUP BY DATE_TRUNC('month', COALESCE(e."data_finalizacao", e."criado_em"))
    ORDER BY DATE_TRUNC('month', COALESCE(e."data_finalizacao", e."criado_em")) ASC
  `;

  return normalizeRows(rows);
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

  if (normalized.cidade) {
    conditions.push(Prisma.sql`e."cidade" ILIKE ${`%${normalized.cidade}%`}`);
  }

  if (normalized.equipe) {
    conditions.push(Prisma.sql`e."equipe" ILIKE ${`%${normalized.equipe}%`}`);
  }

  if (normalized.responsavelId) {
    conditions.push(Prisma.sql`e."responsavel_id" = ${normalized.responsavelId}::uuid`);
  }

  if (normalized.responsavel) {
    conditions.push(Prisma.sql`u."nome" ILIKE ${`%${normalized.responsavel}%`}`);
  }

  if (normalized.modelo) {
    conditions.push(Prisma.sql`e."modelo" ILIKE ${`%${normalized.modelo}%`}`);
  }

  if (normalized.motivo) {
    conditions.push(Prisma.sql`e."motivo" ILIKE ${`%${normalized.motivo}%`}`);
  }

  if (normalized.resolvido === 'true') {
    conditions.push(Prisma.sql`e."resolvido" = true`);
  }

  if (normalized.resolvido === 'false') {
    conditions.push(Prisma.sql`e."resolvido" = false`);
  }

  if (normalized.status) {
    conditions.push(Prisma.sql`e."status" = ${normalized.status}::"StatusEquipamento"`);
  }

  if (normalized.situacaoFinal) {
    conditions.push(Prisma.sql`e."situacao_final" = ${normalized.situacaoFinal}::"SituacaoFinal"`);
  }

  return Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`;
}

function appendCondition(whereSql, conditionSql) {
  return Prisma.sql`${whereSql} AND ${conditionSql}`;
}

function normalizeFilters(filters) {
  const normalized = {
    dataInicial: parseDate(filters.dataInicial, 'dataInicial', false),
    dataFinal: parseDate(filters.dataFinal, 'dataFinal', true),
    cidade: clean(filters.cidade),
    equipe: clean(filters.equipe),
    responsavel: clean(filters.responsavel),
    responsavelId: clean(filters.responsavelId),
    modelo: clean(filters.modelo),
    motivo: clean(filters.motivo),
    resolvido: clean(filters.resolvido),
    status: clean(filters.status),
    situacaoFinal: clean(filters.situacaoFinal)
  };

  if (normalized.dataInicial && normalized.dataFinal && normalized.dataInicial > normalized.dataFinal) {
    throw new HttpError(400, 'Data inicial nao pode ser maior que a data final.');
  }

  return normalized;
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
    'resolvido',
    'responsavel'
  ];

  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => escapeCsv(row[header])).join(','))
  ];

  return lines.join('\n');
}

function escapeCsv(value) {
  if (value === undefined || value === null) return '';
  const normalized = value instanceof Date ? value.toISOString() : String(value);
  return `"${normalized.replaceAll('"', '""')}"`;
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
    taxaDescarte: 0
  };
}

module.exports = { dashboardService };
