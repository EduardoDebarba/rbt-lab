require('dotenv').config();

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3000),
  databaseUrl: process.env.DATABASE_URL,
  corsOrigin: process.env.CORS_ORIGIN || '*',
  jwtSecret: process.env.JWT_SECRET || 'development-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '10h',
  aiProvider: process.env.AI_PROVIDER || 'rules',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  ollamaUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
  ollamaModel: process.env.OLLAMA_MODEL || 'llama3.1',
  resendApiKey: process.env.RESEND_API_KEY || '',
  emailFrom: process.env.EMAIL_FROM || 'RBT Lab <onboarding@resend.dev>',
  adminEmail: process.env.ADMIN_EMAIL || 'eduardo.scheuermann@rbt.psi.br',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173'
};

module.exports = { env };
