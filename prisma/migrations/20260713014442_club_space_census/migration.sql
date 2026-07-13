-- AlterTable
ALTER TABLE "ClubMembership" ADD COLUMN     "cardGeneratedAt" TIMESTAMP(3),
ADD COLUMN     "interviewAt" TIMESTAMP(3),
ADD COLUMN     "interviewNote" TEXT,
ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'MEMBRE';

-- CreateTable
CREATE TABLE "AssignedActivity" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "memberId" INTEGER NOT NULL,
    "clubId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'TODO',
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssignedActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembershipCensus" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "universityId" INTEGER NOT NULL,
    "submittedById" INTEGER NOT NULL,
    "memberCount" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "validatedById" INTEGER,
    "validatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MembershipCensus_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AssignedActivity" ADD CONSTRAINT "AssignedActivity_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignedActivity" ADD CONSTRAINT "AssignedActivity_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipCensus" ADD CONSTRAINT "MembershipCensus_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipCensus" ADD CONSTRAINT "MembershipCensus_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipCensus" ADD CONSTRAINT "MembershipCensus_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipCensus" ADD CONSTRAINT "MembershipCensus_validatedById_fkey" FOREIGN KEY ("validatedById") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

