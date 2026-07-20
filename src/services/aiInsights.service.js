const { env } = require('../config/env');

const PROVIDERS = {
  RULES: 'rules',
  OPENAI: 'openai',
  OLLAMA: 'ollama'
};

const aiInsightsService = {
  async generateReportInsights(payload, fallbackInsights) {
    const provider = normalizeProvider(env.aiProvider);

    if (provider === PROVIDERS.OPENAI && env.openaiApiKey) {
      return withFallback(() => generateOpenAiInsights(payload), fallbackInsights, 'OpenAI');
    }

    if (provider === PROVIDERS.OLLAMA) {
      return withFallback(() => generateOllamaInsights(payload), fallbackInsights, 'IA local');
    }

    return withMetadata(fallbackInsights, 'Regras automáticas', null);
  }
};

async function withFallback(generator, fallbackInsights, source) {
  try {
    const insights = await generator();
    return withMetadata(insights, source, null);
  } catch (error) {
    return withMetadata(
      fallbackInsights,
      'Regras automáticas',
      `Não foi possível gerar insights com ${source}. O relatório usou as regras automáticas.`
    );
  }
}

async function generateOpenAiInsights(payload) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.openaiApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: env.openaiModel,
      temperature: 0.2,
      messages: buildMessages(payload)
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI retornou status ${response.status}.`);
  }

  const data = await response.json();
  return parseInsights(data.choices?.[0]?.message?.content);
}

async function generateOllamaInsights(payload) {
  const response = await fetch(`${env.ollamaUrl.replace(/\/$/, '')}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: env.ollamaModel,
      stream: false,
      messages: buildMessages(payload)
    })
  });

  if (!response.ok) {
    throw new Error(`Ollama retornou status ${response.status}.`);
  }

  const data = await response.json();
  return parseInsights(data.message?.content);
}

function buildMessages(payload) {
  return [
    {
      role: 'system',
      content: [
        'Você é um analista operacional de um laboratório técnico de equipamentos de rede.',
        'Gere insights objetivos, úteis e profissionais em português do Brasil.',
        'Use apenas os dados agregados fornecidos.',
        'Não invente números, nomes, protocolos, compradores ou equipamentos.',
        'Responda exclusivamente em JSON válido, sem markdown.'
      ].join(' ')
    },
    {
      role: 'user',
      content: JSON.stringify({
        tarefa: 'Gerar análise textual para relatório gerencial do laboratório.',
        formato: {
          executivo: 'string com 1 parágrafo curto',
          destaques: ['3 a 6 frases objetivas'],
          pontosPositivos: ['2 a 5 frases objetivas'],
          oportunidades: ['2 a 5 recomendações práticas']
        },
        dados: payload
      })
    }
  ];
}

function parseInsights(content) {
  if (!content || typeof content !== 'string') {
    throw new Error('Resposta de IA vazia.');
  }

  const cleaned = content
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();
  const parsed = JSON.parse(cleaned);

  return {
    executivo: requireString(parsed.executivo),
    destaques: requireStringArray(parsed.destaques),
    pontosPositivos: requireStringArray(parsed.pontosPositivos),
    oportunidades: requireStringArray(parsed.oportunidades)
  };
}

function requireString(value) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error('Campo textual inválido na resposta da IA.');
  }

  return value.trim();
}

function requireStringArray(value) {
  if (!Array.isArray(value)) {
    throw new Error('Lista inválida na resposta da IA.');
  }

  return value
    .filter((item) => typeof item === 'string' && item.trim())
    .map((item) => item.trim())
    .slice(0, 8);
}

function withMetadata(insights, fonte, aviso) {
  return {
    ...insights,
    fonte,
    aviso
  };
}

function normalizeProvider(provider) {
  const normalized = String(provider || '').trim().toLowerCase();

  if (normalized === PROVIDERS.OPENAI) return PROVIDERS.OPENAI;
  if (normalized === PROVIDERS.OLLAMA) return PROVIDERS.OLLAMA;
  return PROVIDERS.RULES;
}

module.exports = { aiInsightsService };
