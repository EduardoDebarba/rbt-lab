CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE "PerfilUsuario" AS ENUM (
  'ADMIN',
  'TECNICO'
);

CREATE TYPE "OrigemEquipamento" AS ENUM (
  'RECOLHIMENTO',
  'CAIXA_OS'
);

CREATE TYPE "StatusEquipamento" AS ENUM (
  'RESET_LIMPEZA',
  'EM_TESTE',
  'FINALIZADO'
);

CREATE TYPE "SituacaoFinal" AS ENUM (
  'REAPROVEITADO',
  'DESCARTE',
  'RMA'
);

CREATE TYPE "AcaoHistorico" AS ENUM (
  'CRIADO',
  'ATUALIZADO',
  'STATUS_ALTERADO',
  'SITUACAO_FINAL_ALTERADA',
  'FINALIZADO',
  'CANCELADO',
  'IMPORTADO'
);

CREATE TABLE "usuarios" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "nome" VARCHAR(120) NOT NULL,
  "email" VARCHAR(160) NOT NULL UNIQUE,
  "senha_hash" VARCHAR(255) NOT NULL,
  "perfil" "PerfilUsuario" NOT NULL DEFAULT 'TECNICO',
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "equipamentos" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "data_finalizacao" TIMESTAMP(3),
  "modelo" VARCHAR(120) NOT NULL,
  "quantidade" INTEGER NOT NULL DEFAULT 1,
  "origem" "OrigemEquipamento" NOT NULL,
  "numero_serie" VARCHAR(120),
  "equipe" VARCHAR(120),
  "protocolo" VARCHAR(120),
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
  "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "equipamentos_responsavel_id_fkey"
    FOREIGN KEY ("responsavel_id") REFERENCES "usuarios"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "equipamentos_quantidade_check"
    CHECK ("quantidade" > 0)
);

CREATE TABLE "historico" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  CONSTRAINT "historico_equipamento_id_fkey"
    FOREIGN KEY ("equipamento_id") REFERENCES "equipamentos"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "historico_usuario_id_fkey"
    FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "equipamentos_data_finalizacao_idx" ON "equipamentos"("data_finalizacao");
CREATE INDEX "equipamentos_modelo_idx" ON "equipamentos"("modelo");
CREATE INDEX "equipamentos_origem_idx" ON "equipamentos"("origem");
CREATE INDEX "equipamentos_status_idx" ON "equipamentos"("status");
CREATE INDEX "equipamentos_situacao_final_idx" ON "equipamentos"("situacao_final");
CREATE INDEX "equipamentos_numero_serie_idx" ON "equipamentos"("numero_serie");
CREATE INDEX "equipamentos_protocolo_idx" ON "equipamentos"("protocolo");
CREATE INDEX "equipamentos_responsavel_id_idx" ON "equipamentos"("responsavel_id");
CREATE INDEX "equipamentos_ativo_idx" ON "equipamentos"("ativo");

CREATE INDEX "historico_equipamento_id_idx" ON "historico"("equipamento_id");
CREATE INDEX "historico_usuario_id_idx" ON "historico"("usuario_id");
CREATE INDEX "historico_acao_idx" ON "historico"("acao");
CREATE INDEX "historico_campo_idx" ON "historico"("campo");
CREATE INDEX "historico_criado_em_idx" ON "historico"("criado_em");

CREATE OR REPLACE FUNCTION update_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
  NEW."atualizado_em" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "usuarios_update_atualizado_em"
BEFORE UPDATE ON "usuarios"
FOR EACH ROW
EXECUTE FUNCTION update_atualizado_em();

CREATE TRIGGER "equipamentos_update_atualizado_em"
BEFORE UPDATE ON "equipamentos"
FOR EACH ROW
EXECUTE FUNCTION update_atualizado_em();
