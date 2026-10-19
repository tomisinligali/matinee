-- CreateTable
CREATE TABLE "background_jobs" (
    "id" TEXT NOT NULL,
    "queue_name" TEXT NOT NULL,
    "job_type" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 5,
    "backoff_seconds" INTEGER NOT NULL DEFAULT 10,
    "locked_by" TEXT,
    "locked_at" TIMESTAMP(3),
    "run_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_error" TEXT,
    "correlation_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "background_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "background_jobs_queue_name_status_run_at_idx" ON "background_jobs"("queue_name", "status", "run_at");
