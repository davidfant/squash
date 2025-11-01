ALTER TABLE "repo" ALTER COLUMN "suggestions" SET DATA TYPE jsonb;--> statement-breakpoint
ALTER TABLE "repo" ALTER COLUMN "suggestions" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "repo" ALTER COLUMN "suggestions" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "repo" ALTER COLUMN "snapshot" SET DATA TYPE jsonb;--> statement-breakpoint
ALTER TABLE "repo_branch" ALTER COLUMN "deployment" SET DATA TYPE jsonb;--> statement-breakpoint
ALTER TABLE "repo_provider" ALTER COLUMN "data" SET DATA TYPE jsonb;--> statement-breakpoint
ALTER TABLE "repo" ADD COLUMN "env" jsonb;