import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCallback, useEffect, useMemo, useState } from "react";

export const FeatureCardEditTitleDialog = ({
  title,
  open,
  onOpenChange,
  onEdit,
}: {
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?(value: string): unknown;
}) => {
  const [editValue, setEditValue] = useState(title);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmedValue = useMemo(() => editValue.trim(), [editValue]);
  useEffect(() => {
    if (!open) {
      setEditValue(title);
    }
  }, [open, title]);

  const closeDialog = useCallback(() => {
    onOpenChange(false);
    setEditValue(title);
    setSaving(false);
    setError(null);
  }, [title]);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!onEdit) return;

      if (!trimmedValue.length || trimmedValue === title) {
        closeDialog();
        return;
      }

      setSaving(true);
      setError(null);
      try {
        await onEdit(trimmedValue);
        closeDialog();
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message || "Failed to update"
            : "Failed to update";
        setError(message);
      } finally {
        setSaving(false);
      }
    },
    [closeDialog, onEdit, title, trimmedValue]
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) {
          closeDialog();
        } else {
          onOpenChange(true);
          setEditValue(title);
          setError(null);
          setSaving(false);
        }
      }}
    >
      <DialogContent onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Rename</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={editValue}
              onChange={(event) => setEditValue(event.target.value)}
              autoFocus
              aria-invalid={!!error}
            />
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={closeDialog}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={saving}
              disabled={saving || !trimmedValue.length}
            >
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
