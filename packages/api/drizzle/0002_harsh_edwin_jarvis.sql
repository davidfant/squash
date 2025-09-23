ALTER TABLE "repo" ADD COLUMN "hidden" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "repo_branch" ADD COLUMN "image_url" text;