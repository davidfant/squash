ALTER TABLE "user" ADD COLUMN "active_organization_id" uuid;

ALTER TABLE "user"
  ADD CONSTRAINT "user_active_organization_id_organization_id_fk"
  FOREIGN KEY ("active_organization_id") REFERENCES "organization"("id")
  ON DELETE SET NULL ON UPDATE NO ACTION;
