CREATE TYPE "StatusIntegracaoZoho" AS ENUM ('SUCESSO', 'ERRO');

CREATE TABLE IF NOT EXISTS "zoho_importacoes" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "linha_zoho_id" VARCHAR(160) NOT NULL,
  "equipamento_id" UUID,
  "status" "StatusIntegracaoZoho" NOT NULL,
  "erro" TEXT,
  "payload" JSONB NOT NULL,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "zoho_importacoes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "zoho_importacoes_linha_zoho_id_key"
ON "zoho_importacoes"("linha_zoho_id");

CREATE INDEX IF NOT EXISTS "zoho_importacoes_equipamento_id_idx"
ON "zoho_importacoes"("equipamento_id");

CREATE INDEX IF NOT EXISTS "zoho_importacoes_status_idx"
ON "zoho_importacoes"("status");

CREATE INDEX IF NOT EXISTS "zoho_importacoes_atualizado_em_idx"
ON "zoho_importacoes"("atualizado_em");
