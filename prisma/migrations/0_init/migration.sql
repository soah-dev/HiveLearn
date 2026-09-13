-- Baseline migration generated from prisma/schema.prisma on 2026-09-13.
-- The production database already matches this schema (it was managed with `prisma db push`).
-- Mark it applied there with:  npx prisma migrate resolve --applied 0_init

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "firebaseUid" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "image" TEXT,
    "role" TEXT,
    "grade" INTEGER,
    "leaderboardOptOut" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "satEnabled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PointsLedger" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointsLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParentChild" (
    "id" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "childId" TEXT,
    "inviteToken" TEXT NOT NULL,
    "childEmail" TEXT NOT NULL,
    "childName" TEXT NOT NULL,
    "childGrade" INTEGER NOT NULL DEFAULT 6,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "weeklyReportEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParentChild_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assignment" (
    "id" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "grade" INTEGER NOT NULL,
    "subject" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL DEFAULT 'medium',
    "numQuestions" INTEGER NOT NULL,
    "timeLimitMin" INTEGER,
    "reviewMode" TEXT NOT NULL DEFAULT 'ai',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "aiFeedback" TEXT,
    "parentComment" TEXT,
    "score" INTEGER,
    "pointsAwarded" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "questionType" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "optionA" TEXT,
    "optionB" TEXT,
    "optionC" TEXT,
    "optionD" TEXT,
    "correctAnswer" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Answer" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "selectedAnswer" TEXT,
    "isCorrect" BOOLEAN,
    "aiExplanation" TEXT,
    "aiScore" INTEGER,
    "parentComment" TEXT,
    "flagged" BOOLEAN NOT NULL DEFAULT false,
    "flagReason" TEXT,
    "flagResolvedAt" TIMESTAMP(3),
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Answer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PracticeSession" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "grade" INTEGER NOT NULL,
    "subject" TEXT NOT NULL,
    "topic" TEXT,
    "difficulty" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "score" INTEGER,
    "pointsAwarded" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "PracticeSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PracticeQuestion" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "optionA" TEXT NOT NULL,
    "optionB" TEXT NOT NULL,
    "optionC" TEXT NOT NULL,
    "optionD" TEXT NOT NULL,
    "correctAnswer" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,

    CONSTRAINT "PracticeQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PracticeAnswer" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "selectedAnswer" TEXT,
    "isCorrect" BOOLEAN,
    "flagged" BOOLEAN NOT NULL DEFAULT false,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PracticeAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfflineWork" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "parentId" TEXT,
    "subject" TEXT NOT NULL,
    "bookReference" TEXT,
    "numQuestions" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "difficulty" TEXT NOT NULL DEFAULT 'medium',
    "activityDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "parentComment" TEXT,
    "pointsAwarded" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "OfflineWork_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Gamification" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastCompletedDate" TEXT,

    CONSTRAINT "Gamification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Badge" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "criteria" TEXT NOT NULL,

    CONSTRAINT "Badge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EarnedBadge" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EarnedBadge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "message" TEXT NOT NULL,
    "screenshotUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "response" TEXT,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "promptTokens" INTEGER NOT NULL,
    "completionTokens" INTEGER NOT NULL,
    "totalTokens" INTEGER NOT NULL,
    "assignmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SATSession" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'not_started',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "breakStartedAt" TIMESTAMP(3),
    "rwMod2Difficulty" TEXT,
    "mathMod2Difficulty" TEXT,
    "rwScaledScore" INTEGER,
    "mathScaledScore" INTEGER,
    "compositeScore" INTEGER,
    "pointsAwarded" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SATSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SATModule" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "moduleNumber" INTEGER NOT NULL,
    "difficulty" TEXT NOT NULL DEFAULT 'standard',
    "numQuestions" INTEGER NOT NULL,
    "timeLimitMin" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'not_started',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "rawScore" INTEGER,

    CONSTRAINT "SATModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SATQuestion" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "questionType" TEXT NOT NULL,
    "passage" TEXT,
    "questionText" TEXT NOT NULL,
    "optionA" TEXT,
    "optionB" TEXT,
    "optionC" TEXT,
    "optionD" TEXT,
    "correctAnswer" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,

    CONSTRAINT "SATQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SATAnswer" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "selectedAnswer" TEXT,
    "isCorrect" BOOLEAN,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SATAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssignmentPreset" (
    "id" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "grade" INTEGER NOT NULL,
    "subject" TEXT NOT NULL,
    "topic" TEXT,
    "difficulty" TEXT NOT NULL DEFAULT 'medium',
    "numQuestions" INTEGER NOT NULL DEFAULT 5,
    "questionTypes" TEXT NOT NULL DEFAULT 'multiple_choice',
    "timeLimitMin" INTEGER,
    "reviewMode" TEXT NOT NULL DEFAULT 'ai',
    "daysOfWeek" TEXT NOT NULL DEFAULT '1,2,3,4,5',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastGeneratedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssignmentPreset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_firebaseUid_key" ON "User"("firebaseUid");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "PointsLedger_childId_occurredAt_idx" ON "PointsLedger"("childId", "occurredAt");

-- CreateIndex
CREATE INDEX "PointsLedger_occurredAt_idx" ON "PointsLedger"("occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "PointsLedger_sourceType_sourceId_key" ON "PointsLedger"("sourceType", "sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "ParentChild_inviteToken_key" ON "ParentChild"("inviteToken");

-- CreateIndex
CREATE UNIQUE INDEX "ParentChild_parentId_childId_key" ON "ParentChild"("parentId", "childId");

-- CreateIndex
CREATE UNIQUE INDEX "Answer_questionId_childId_key" ON "Answer"("questionId", "childId");

-- CreateIndex
CREATE UNIQUE INDEX "PracticeAnswer_questionId_childId_key" ON "PracticeAnswer"("questionId", "childId");

-- CreateIndex
CREATE UNIQUE INDEX "Gamification_childId_key" ON "Gamification"("childId");

-- CreateIndex
CREATE UNIQUE INDEX "Badge_name_key" ON "Badge"("name");

-- CreateIndex
CREATE UNIQUE INDEX "EarnedBadge_childId_badgeId_key" ON "EarnedBadge"("childId", "badgeId");

-- CreateIndex
CREATE UNIQUE INDEX "SATAnswer_questionId_childId_key" ON "SATAnswer"("questionId", "childId");

-- AddForeignKey
ALTER TABLE "PointsLedger" ADD CONSTRAINT "PointsLedger_childId_fkey" FOREIGN KEY ("childId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentChild" ADD CONSTRAINT "ParentChild_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentChild" ADD CONSTRAINT "ParentChild_childId_fkey" FOREIGN KEY ("childId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_childId_fkey" FOREIGN KEY ("childId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_childId_fkey" FOREIGN KEY ("childId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeSession" ADD CONSTRAINT "PracticeSession_childId_fkey" FOREIGN KEY ("childId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeQuestion" ADD CONSTRAINT "PracticeQuestion_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PracticeSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeAnswer" ADD CONSTRAINT "PracticeAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "PracticeQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfflineWork" ADD CONSTRAINT "OfflineWork_childId_fkey" FOREIGN KEY ("childId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfflineWork" ADD CONSTRAINT "OfflineWork_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gamification" ADD CONSTRAINT "Gamification_childId_fkey" FOREIGN KEY ("childId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EarnedBadge" ADD CONSTRAINT "EarnedBadge_childId_fkey" FOREIGN KEY ("childId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EarnedBadge" ADD CONSTRAINT "EarnedBadge_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "Badge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiUsage" ADD CONSTRAINT "AiUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SATSession" ADD CONSTRAINT "SATSession_childId_fkey" FOREIGN KEY ("childId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SATModule" ADD CONSTRAINT "SATModule_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SATSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SATQuestion" ADD CONSTRAINT "SATQuestion_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "SATModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SATAnswer" ADD CONSTRAINT "SATAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "SATQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SATAnswer" ADD CONSTRAINT "SATAnswer_childId_fkey" FOREIGN KEY ("childId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentPreset" ADD CONSTRAINT "AssignmentPreset_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentPreset" ADD CONSTRAINT "AssignmentPreset_childId_fkey" FOREIGN KEY ("childId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

