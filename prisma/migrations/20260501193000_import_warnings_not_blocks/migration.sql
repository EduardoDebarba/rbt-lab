ALTER TABLE "equipamentos" DROP CONSTRAINT IF EXISTS "equipamentos_rma_descarte_quantidade_check";
ALTER TABLE "equipamentos" DROP CONSTRAINT IF EXISTS "equipamentos_rma_descarte_sn_check";
ALTER TABLE "equipamentos" DROP CONSTRAINT IF EXISTS "equipamentos_rma_descarte_motivo_check";
ALTER TABLE "equipamentos" DROP CONSTRAINT IF EXISTS "equipamentos_rma_descarte_equipe_check";
ALTER TABLE "equipamentos" DROP CONSTRAINT IF EXISTS "equipamentos_rma_descarte_cidade_check";
ALTER TABLE "equipamentos" DROP CONSTRAINT IF EXISTS "equipamentos_caixa_os_resolvido_check";
ALTER TABLE "equipamentos" DROP CONSTRAINT IF EXISTS "equipamentos_recolhimento_sem_resolvido_check";
