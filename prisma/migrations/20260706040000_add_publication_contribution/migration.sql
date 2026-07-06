-- CreateTable: Publication (journal scientifique)
CREATE TABLE "Publication" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "authorId" INTEGER NOT NULL,
    "projectId" TEXT,
    "clubId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Publication_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Contribution (dons & partenariats)
CREATE TABLE "Contribution" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" INTEGER,
    "organisation" TEXT,
    "email" TEXT NOT NULL,
    "message" TEXT,
    "memberId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Contribution_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey: Publication -> Member
ALTER TABLE "Publication" ADD CONSTRAINT "Publication_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: Publication -> Project
ALTER TABLE "Publication" ADD CONSTRAINT "Publication_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: Publication -> Club
ALTER TABLE "Publication" ADD CONSTRAINT "Publication_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: Contribution -> Member
ALTER TABLE "Contribution" ADD CONSTRAINT "Contribution_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Indexes for Publication
CREATE INDEX "Publication_status_idx" ON "Publication"("status");
CREATE INDEX "Publication_category_idx" ON "Publication"("category");
CREATE INDEX "Publication_authorId_idx" ON "Publication"("authorId");
CREATE INDEX "Publication_projectId_idx" ON "Publication"("projectId");
CREATE INDEX "Publication_clubId_idx" ON "Publication"("clubId");

-- Indexes for Contribution
CREATE INDEX "Contribution_type_idx" ON "Contribution"("type");
CREATE INDEX "Contribution_memberId_idx" ON "Contribution"("memberId");
