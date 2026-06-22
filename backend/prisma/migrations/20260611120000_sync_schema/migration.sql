-- CreateTable
CREATE TABLE IF NOT EXISTS "candidate_job_matches" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "matchScore" DOUBLE PRECISION NOT NULL,
    "matchedSkills" TEXT[],
    "missingSkills" TEXT[],
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidate_job_matches_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "matchedSkills" TEXT[];
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "missingSkills" TEXT[];

-- Alter embedding columns from vector to JSONB
ALTER TABLE "resume_files" DROP COLUMN IF EXISTS "embedding";
ALTER TABLE "resume_files" ADD COLUMN IF NOT EXISTS "embedding" JSONB;

ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "embedding" JSONB;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "applications_jobId_candidateId_key" ON "applications"("jobId", "candidateId");
CREATE UNIQUE INDEX IF NOT EXISTS "candidate_job_matches_jobId_candidateId_key" ON "candidate_job_matches"("jobId", "candidateId");
CREATE INDEX IF NOT EXISTS "applications_status_idx" ON "applications"("status");
CREATE INDEX IF NOT EXISTS "applications_candidateId_idx" ON "applications"("candidateId");
CREATE INDEX IF NOT EXISTS "candidate_job_matches_matchScore_idx" ON "candidate_job_matches"("matchScore" DESC);
CREATE INDEX IF NOT EXISTS "jobs_status_createdAt_idx" ON "jobs"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "jobs_companyId_idx" ON "jobs"("companyId");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "candidate_job_matches" ADD CONSTRAINT "candidate_job_matches_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "candidate_job_matches" ADD CONSTRAINT "candidate_job_matches_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidate_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
