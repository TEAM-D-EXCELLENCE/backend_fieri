-- CreateTable: Opportunity (missing from previous migration)
CREATE TABLE "Opportunity" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "discipline" TEXT NOT NULL,
    "salary" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "authorId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey: Opportunity -> Member
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable: Add ownerId to Project (missing from previous migration)
ALTER TABLE "Project" ADD COLUMN "ownerId" INTEGER;

-- AddForeignKey: Project -> Member (owner)
ALTER TABLE "Project" ADD CONSTRAINT "Project_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: Application -> Opportunity (missing from previous migration)
ALTER TABLE "Application" ADD CONSTRAINT "Application_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex for Opportunity (optional, improves performance)
CREATE INDEX "Opportunity_status_idx" ON "Opportunity"("status");
CREATE INDEX "Opportunity_type_idx" ON "Opportunity"("type");
CREATE INDEX "Opportunity_discipline_idx" ON "Opportunity"("discipline");
