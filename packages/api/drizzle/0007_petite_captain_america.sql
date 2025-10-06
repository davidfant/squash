ALTER TABLE "repo" RENAME COLUMN "url" TO "gitUrl";--> statement-breakpoint
ALTER TABLE "repo" ADD COLUMN "previewUrl" text;--> statement-breakpoint
ALTER TABLE "repo" ADD COLUMN "imageUrl" text;