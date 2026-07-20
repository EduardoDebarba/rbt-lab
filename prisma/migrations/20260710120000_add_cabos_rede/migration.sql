CREATE TABLE "cabos_rede" (
    "id" UUID NOT NULL,
    "metragem" DECIMAL(8,2) NOT NULL,
    "quantidade" INTEGER NOT NULL DEFAULT 0,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cabos_rede_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "cabos_rede_metragem_key" ON "cabos_rede"("metragem");
