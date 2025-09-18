ALTER TABLE "repo_branch" ALTER COLUMN "sandbox" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "message" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;