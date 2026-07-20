CREATE SCHEMA IF NOT EXISTS "public";

CREATE TYPE "PerfilUsuario" AS ENUM ('ADMIN', 'TECNICO');

CREATE TYPE "OrigemEquipamento" AS ENUM ('RECOLHIMENTO', 'CAIXA_OS');

CREATE TYPE "StatusEquipamento" AS ENUM ('RESET_LIMPEZA', 'EM_TESTE', 'FINALIZADO');

CREATE TYPE "SituacaoFinal" AS ENUM ('REAPROVEITADO', 'DESCARTE', 'RMA');

CREATE TYPE "AcaoHistorico" AS ENUM ('CRIADO', 'ATUALIZADO', 'STATUS_ALTERADO', 'SITUACAO_FINAL_ALTERADA', 'FINALIZADO', 'CANCELADO', 'IMPORTADO');

CREATE TABLE "usuarios" (
    "id" UUID NOT NULL,
    "nome" VARCHAR(120) NOT NULL,
    "email" VARCHAR(160) NOT NULL,
    "senha_hash" VARCHAR(255) NOT NULL,
    "perfil" "PerfilUsuario" NOT NULL DEFAULT 'TECNICO',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "equipamentos" (
    "id" UUID NOT NULL,
    "data_finalizacao" TIMESTAMP(3),
    "modelo" VARCHAR(120) NOT NULL,
    "quantidade" INTEGER NOT NULL DEFAULT 1,
    "origem" "OrigemEquipamento" NOT NULL,
    "numero_serie" VARCHAR(120),
    "equipe" VARCHAR(120),
    "cidade" VARCHAR(120),
    "status" "StatusEquipamento" NOT NULL,
    "situacao_final" "SituacaoFinal" NOT NULL,
    "motivo" TEXT,
    "resolvido" BOOLEAN,
    "responsavel_id" UUID NOT NULL,
    "observacoes" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "excluido_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipamentos_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "historico" (
    "id" UUID NOT NULL,
    "equipamento_id" UUID,
    "usuario_id" UUID NOT NULL,
    "acao" "AcaoHistorico" NOT NULL,
    "entidade" VARCHAR(80) NOT NULL,
    "campo" VARCHAR(120) NOT NULL,
    "valor_antigo" TEXT,
    "valor_novo" TEXT,
    "dados_anteriores" JSONB,
    "dados_novos" JSONB,
    "observacao" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historico_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

CREATE INDEX "equipamentos_data_finalizacao_idx" ON "equipamentos"("data_finalizacao");

CREATE INDEX "equipamentos_modelo_idx" ON "equipamentos"("modelo");

CREATE INDEX "equipamentos_origem_idx" ON "equipamentos"("origem");

CREATE INDEX "equipamentos_status_idx" ON "equipamentos"("status");

CREATE INDEX "equipamentos_situacao_final_idx" ON "equipamentos"("situacao_final");

CREATE INDEX "equipamentos_numero_serie_idx" ON "equipamentos"("numero_serie");

CREATE INDEX "equipamentos_responsavel_id_idx" ON "equipamentos"("responsavel_id");

CREATE INDEX "equipamentos_ativo_idx" ON "equipamentos"("ativo");

CREATE INDEX "historico_equipamento_id_idx" ON "historico"("equipamento_id");

CREATE INDEX "historico_usuario_id_idx" ON "historico"("usuario_id");

CREATE INDEX "historico_acao_idx" ON "historico"("acao");

CREATE INDEX "historico_campo_idx" ON "historico"("campo");

CREATE INDEX "historico_criado_em_idx" ON "historico"("criado_em");

ALTER TABLE "equipamentos" ADD CONSTRAINT "equipamentos_responsavel_id_fkey" FOREIGN KEY ("responsavel_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "equipamentos" ADD CONSTRAINT "equipamentos_quantidade_check" CHECK ("quantidade" > 0);

ALTER TABLE "equipamentos" ADD CONSTRAINT "equipamentos_rma_descarte_quantidade_check" CHECK ("situacao_final" NOT IN ('RMA', 'DESCARTE') OR "quantidade" = 1);

ALTER TABLE "equipamentos" ADD CONSTRAINT "equipamentos_rma_descarte_sn_check" CHECK ("situacao_final" NOT IN ('RMA', 'DESCARTE') OR "numero_serie" IS NOT NULL);

ALTER TABLE "equipamentos" ADD CONSTRAINT "equipamentos_rma_descarte_motivo_check" CHECK ("situacao_final" NOT IN ('RMA', 'DESCARTE') OR "motivo" IS NOT NULL);

ALTER TABLE "equipamentos" ADD CONSTRAINT "equipamentos_rma_descarte_equipe_check" CHECK ("situacao_final" NOT IN ('RMA', 'DESCARTE') OR "equipe" IS NOT NULL);

ALTER TABLE "equipamentos" ADD CONSTRAINT "equipamentos_rma_descarte_cidade_check" CHECK ("situacao_final" NOT IN ('RMA', 'DESCARTE') OR "cidade" IS NOT NULL);

ALTER TABLE "equipamentos" ADD CONSTRAINT "equipamentos_reaproveitado_sem_motivo_check" CHECK ("situacao_final" <> 'REAPROVEITADO' OR "motivo" IS NULL);

ALTER TABLE "equipamentos" ADD CONSTRAINT "equipamentos_caixa_os_resolvido_check" CHECK ("origem" <> 'CAIXA_OS' OR "resolvido" IS NOT NULL);

ALTER TABLE "equipamentos" ADD CONSTRAINT "equipamentos_recolhimento_sem_resolvido_check" CHECK ("origem" <> 'RECOLHIMENTO' OR "resolvido" IS NULL);

ALTER TABLE "historico" ADD CONSTRAINT "historico_equipamento_id_fkey" FOREIGN KEY ("equipamento_id") REFERENCES "equipamentos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "historico" ADD CONSTRAINT "historico_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
