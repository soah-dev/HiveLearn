-- AlterTable
ALTER TABLE "PracticeSession" ADD COLUMN     "lessonId" TEXT;

-- CreateTable
CREATE TABLE "StudyLesson" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "grade" INTEGER NOT NULL,
    "subject" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudyLesson_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudyLesson_childId_createdAt_idx" ON "StudyLesson"("childId", "createdAt");

-- CreateIndex
CREATE INDEX "PracticeSession_lessonId_idx" ON "PracticeSession"("lessonId");

-- AddForeignKey
ALTER TABLE "PracticeSession" ADD CONSTRAINT "PracticeSession_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "StudyLesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyLesson" ADD CONSTRAINT "StudyLesson_childId_fkey" FOREIGN KEY ("childId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Row-Level Security: default-deny for the Supabase anon/PostgREST API, as on
-- every other table (see prisma/enable_rls.sql). Prisma's role bypasses RLS.
ALTER TABLE "StudyLesson" ENABLE ROW LEVEL SECURITY;
