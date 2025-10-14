ALTER TABLE "repo" ADD COLUMN "suggestions" json DEFAULT '[]'::json NOT NULL;
