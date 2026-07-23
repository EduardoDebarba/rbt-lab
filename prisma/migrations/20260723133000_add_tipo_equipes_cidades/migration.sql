ALTER TABLE "equipes_cidades"
ADD COLUMN IF NOT EXISTS "tipo" VARCHAR(20) NOT NULL DEFAULT 'EQUIPE';

CREATE INDEX IF NOT EXISTS "equipes_cidades_tipo_idx" ON "equipes_cidades"("tipo");
