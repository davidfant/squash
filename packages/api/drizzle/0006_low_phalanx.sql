UPDATE "invitation" SET "role" = 'viewer' WHERE "role" = 'member';
UPDATE "member" SET "role" = 'viewer' WHERE "role" = 'member';

CREATE TYPE "public"."member_role" AS ENUM('owner', 'admin', 'editor', 'viewer');

ALTER TABLE "invitation" ALTER COLUMN "role" SET DEFAULT 'editor'::"public"."member_role";
ALTER TABLE "invitation" ALTER COLUMN "role" SET DATA TYPE "public"."member_role" USING "role"::"public"."member_role";

ALTER TABLE "member" ALTER COLUMN "role" SET DEFAULT 'editor'::"public"."member_role";
ALTER TABLE "member" ALTER COLUMN "role" SET DATA TYPE "public"."member_role" USING "role"::"public"."member_role";

ALTER TABLE "member" ALTER COLUMN "role" DROP DEFAULT;