ALTER TABLE "equipamentos" ADD COLUMN "protocolo" VARCHAR(120);

CREATE INDEX "equipamentos_protocolo_idx" ON "equipamentos"("protocolo");
