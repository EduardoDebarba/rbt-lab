CREATE TABLE IF NOT EXISTS "opcoes_filtro_equipamento" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tipo" VARCHAR(40) NOT NULL,
  "nome" VARCHAR(160) NOT NULL,
  "nome_busca" VARCHAR(180) NOT NULL,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "opcoes_filtro_equipamento_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "opcoes_filtro_equipamento_tipo_nome_busca_key"
  ON "opcoes_filtro_equipamento"("tipo", "nome_busca");

CREATE INDEX IF NOT EXISTS "opcoes_filtro_equipamento_tipo_idx"
  ON "opcoes_filtro_equipamento"("tipo");
