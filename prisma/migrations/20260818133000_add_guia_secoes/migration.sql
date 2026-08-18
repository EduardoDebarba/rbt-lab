CREATE TABLE IF NOT EXISTS "guia_secoes" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "titulo" VARCHAR(180) NOT NULL,
  "conteudo" TEXT NOT NULL,
  "ordem" INTEGER NOT NULL DEFAULT 0,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "guia_secoes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "guia_secoes_ativo_ordem_idx"
ON "guia_secoes"("ativo", "ordem");
