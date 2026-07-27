ALTER TABLE "usuarios"
ADD COLUMN IF NOT EXISTS "reset_senha_codigo_hash" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "reset_senha_expira_em" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "senha_atualizada_em" TIMESTAMP(3);
