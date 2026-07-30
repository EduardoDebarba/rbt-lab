CREATE TABLE IF NOT EXISTS "apelidos_modelos_dashboard" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "modelo_original" VARCHAR(160) NOT NULL,
  "nome_grafico" VARCHAR(80) NOT NULL,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "apelidos_modelos_dashboard_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "apelidos_modelos_dashboard_modelo_original_key"
ON "apelidos_modelos_dashboard"("modelo_original");
