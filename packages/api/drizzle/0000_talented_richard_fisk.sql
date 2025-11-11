CREATE TYPE "public"."message_role" AS ENUM('system', 'user', 'assistant');--> statement-breakpoint
CREATE TYPE "public"."sandbox_provider_type" AS ENUM('cloudflare', 'fly', 'vercel', 'daytona');--> statement-breakpoint
CREATE TABLE "message" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role" "message_role" NOT NULL,
	"parts" jsonb NOT NULL,
	"usage" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"thread_id" uuid NOT NULL,
	"parent_id" uuid,
	"created_by" text
);
--> statement-breakpoint
CREATE TABLE "message_thread" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ip_address" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "repo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"previewUrl" text,
	"imageUrl" text,
	"gitUrl" text NOT NULL,
	"name" text NOT NULL,
	"suggestions" jsonb,
	"snapshot" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"default_branch" text NOT NULL,
	"public" boolean NOT NULL,
	"organization_id" text NOT NULL,
	"created_by" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "repo_branch" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"name" text NOT NULL,
	"sandbox_provider" "sandbox_provider_type" DEFAULT 'cloudflare' NOT NULL,
	"env" jsonb,
	"image_url" text,
	"deployment" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"thread_id" uuid NOT NULL,
	"repo_id" uuid NOT NULL,
	"created_by" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"username" text,
	"first_name" text,
	"last_name" text,
	"image_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_thread_id_message_thread_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."message_thread"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_parent_id_message_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."message"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repo_branch" ADD CONSTRAINT "repo_branch_thread_id_message_thread_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."message_thread"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repo_branch" ADD CONSTRAINT "repo_branch_repo_id_repo_id_fk" FOREIGN KEY ("repo_id") REFERENCES "public"."repo"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "message_parent_id_index" ON "message" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "message_thread_id_index" ON "message" USING btree ("thread_id");--> statement-breakpoint
CREATE INDEX "repo_created_by_index" ON "repo" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "repo_organization_id_index" ON "repo" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "repo_branch_thread_id_index" ON "repo_branch" USING btree ("thread_id");--> statement-breakpoint
CREATE INDEX "repo_branch_created_by_index" ON "repo_branch" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "repo_branch_repo_id_index" ON "repo_branch" USING btree ("repo_id");