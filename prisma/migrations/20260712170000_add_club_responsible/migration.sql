-- AlterTable
ALTER TABLE "Club" ADD COLUMN "responsibleId" INTEGER;

-- AddForeignKey
ALTER TABLE "Club" ADD CONSTRAINT "Club_responsibleId_fkey" FOREIGN KEY ("responsibleId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;
