-- Rattrapage de dérive : ces deux changements avaient été appliqués en base via
-- `prisma db push` (voir l'ancien script `vercel-build`) sans migration
-- correspondante. Le schéma Prisma les déclarait déjà, mais une base reconstruite
-- à partir de l'historique de migrations ne les avait pas — d'où l'erreur
-- runtime « The column `Member.signatureUrl` does not exist ».

-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "signatureUrl" TEXT,
ALTER COLUMN "role" SET DEFAULT 'ETUDIANT';
