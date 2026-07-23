CREATE TABLE "equipes_cidades" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "equipe" VARCHAR(120) NOT NULL,
  "cidade" VARCHAR(120) NOT NULL,
  "supervisor" VARCHAR(120) NOT NULL,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "equipes_cidades_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "equipes_cidades_equipe_idx" ON "equipes_cidades"("equipe");
CREATE INDEX "equipes_cidades_cidade_idx" ON "equipes_cidades"("cidade");
CREATE INDEX "equipes_cidades_supervisor_idx" ON "equipes_cidades"("supervisor");
CREATE INDEX "equipes_cidades_ativo_idx" ON "equipes_cidades"("ativo");
