-- CreateTable
CREATE TABLE "admin_access_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "workspace_id" UUID,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "reason" VARCHAR(500),
    "ip_address" TEXT,
    "user_agent" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "admin_access_logs_user_id_created_at_idx" ON "admin_access_logs"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "admin_access_logs_workspace_id_created_at_idx" ON "admin_access_logs"("workspace_id", "created_at");

-- CreateIndex
CREATE INDEX "admin_access_logs_action_created_at_idx" ON "admin_access_logs"("action", "created_at");

-- AddForeignKey
ALTER TABLE "admin_access_logs" ADD CONSTRAINT "admin_access_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_access_logs" ADD CONSTRAINT "admin_access_logs_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;
