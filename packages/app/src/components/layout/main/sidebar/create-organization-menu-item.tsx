import { authClient } from "@/auth/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import kebabCase from "lodash.kebabcase";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import * as uuid from "uuid";

export function CreateOrganizationMenuItem({
  onSuccess,
}: {
  onSuccess: (organizationId: string) => void;
}) {
  const [name, setName] = useState("");
  const { t } = useTranslation("auth");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCreateOrganization = async () => {
    if (!name.trim()) return;

    setLoading(true);
    try {
      const res = await authClient.organization.create({
        name: name,
        slug: `${kebabCase(name)}-${uuid.v4().split("-")[0]}`,
      });
      if (res.error) {
        console.error("Failed to create organization:", res.error);
        return;
      }

      setName("");
      setOpen(false);
      await onSuccess(res.data.id);
    } catch (error) {
      console.error("Failed to create organization:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <DropdownMenuItem
          onSelect={(e) => e.preventDefault()}
          className="cursor-pointer"
        >
          <Plus className="size-4 mx-1" />
          {t("avatar.createOrganization.title")}
        </DropdownMenuItem>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("avatar.createOrganization.title")}</DialogTitle>
          <DialogDescription>
            {t("avatar.createOrganization.description")}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="organization-name">
              {t("avatar.createOrganization.name.label")}
            </Label>
            <Input
              id="organization-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("avatar.createOrganization.name.placeholder")}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !loading) {
                  handleCreateOrganization();
                }
              }}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            {t("cancel", { ns: "common" })}
          </Button>
          <Button
            onClick={handleCreateOrganization}
            disabled={!name.trim() || loading}
          >
            {loading
              ? t("creating...", { ns: "common" })
              : t("create", { ns: "common" })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
