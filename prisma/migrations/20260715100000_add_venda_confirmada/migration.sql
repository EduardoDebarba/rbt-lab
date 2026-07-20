ALTER TABLE "equipamentos"
  ADD COLUMN IF NOT EXISTS "venda_confirmada" BOOLEAN NOT NULL DEFAULT true;
