ALTER TABLE "usuarios"
ALTER COLUMN "perfil" SET DEFAULT 'USER';

UPDATE "usuarios"
SET "perfil" = 'USER'
WHERE "perfil" = 'TECNICO';

UPDATE "usuarios"
SET "perfil" = 'SUPER_ADMIN'
WHERE "email" = 'eduardo.scheuermann@rbt.psi.br';
