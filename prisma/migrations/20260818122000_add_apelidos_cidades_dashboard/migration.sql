CREATE TABLE IF NOT EXISTS "apelidos_cidades_dashboard" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "cidade_original" VARCHAR(160) NOT NULL,
  "nome_grafico" VARCHAR(80) NOT NULL,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "apelidos_cidades_dashboard_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "apelidos_cidades_dashboard_cidade_original_key"
ON "apelidos_cidades_dashboard"("cidade_original");
