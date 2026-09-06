-- CreateTable
CREATE TABLE "NewsReaction" (
    "id" TEXT NOT NULL,
    "newsId" TEXT NOT NULL,
    "memberId" INTEGER NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsReaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NewsReaction_newsId_idx" ON "NewsReaction"("newsId");

-- CreateIndex
CREATE UNIQUE INDEX "NewsReaction_newsId_memberId_key" ON "NewsReaction"("newsId", "memberId");

-- AddForeignKey
ALTER TABLE "NewsReaction" ADD CONSTRAINT "NewsReaction_newsId_fkey" FOREIGN KEY ("newsId") REFERENCES "News"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsReaction" ADD CONSTRAINT "NewsReaction_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

