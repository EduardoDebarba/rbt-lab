CREATE TABLE "motivos_equipamento" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "nome" VARCHAR(160) NOT NULL,
  "nome_busca" VARCHAR(180) NOT NULL,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "motivos_equipamento_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "motivos_equipamento_nome_key" ON "motivos_equipamento"("nome");
CREATE UNIQUE INDEX "motivos_equipamento_nome_busca_key" ON "motivos_equipamento"("nome_busca");
CREATE INDEX "motivos_equipamento_ativo_idx" ON "motivos_equipamento"("ativo");
