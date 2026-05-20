CREATE TABLE "modelos_equipamento" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "nome" VARCHAR(160) NOT NULL,
  "nome_busca" VARCHAR(180) NOT NULL,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "modelos_equipamento_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "modelos_equipamento_nome_key" ON "modelos_equipamento"("nome");
CREATE UNIQUE INDEX "modelos_equipamento_nome_busca_key" ON "modelos_equipamento"("nome_busca");
CREATE INDEX "modelos_equipamento_ativo_idx" ON "modelos_equipamento"("ativo");
