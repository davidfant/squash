import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/sonner";
import { Loader2 } from "lucide-react";

interface FrameworkInfo {
  name: string;
  confidence: "high" | "medium" | "low";
  port: number;
  entrypoint: string;
  detected: {
    dependencies: string[];
    scripts: string[];
  };
}

interface FrameworkDetectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  repoId: string;
  repoName: string;
  onSave?: (framework: FrameworkInfo) => void;
}

export function FrameworkDetectionModal({
  open,
  onOpenChange,
  repoId,
  repoName,
  onSave,
}: FrameworkDetectionModalProps) {
  const [isDetecting, setIsDetecting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [frameworkInfo, setFrameworkInfo] = useState<FrameworkInfo | null>(null);
  const [editedInfo, setEditedInfo] = useState<FrameworkInfo | null>(null);

  const detectFramework = async () => {
    setIsDetecting(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8787";
      const response = await fetch(`${apiUrl}/repos/${repoId}/detect-framework`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setFrameworkInfo(data.framework);
      setEditedInfo(data.framework);
    } catch (error) {
      console.error("Error detecting framework:", error);
      toast.error("Failed to detect framework");
    } finally {
      setIsDetecting(false);
    }
  };

  const handleSave = async () => {
    if (!editedInfo || isSaving) return;
    
    setIsSaving(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8787";
      const snapshot = {
        type: "docker" as const,
        port: editedInfo.port,
        image: "node:20-alpine",
        entrypoint: editedInfo.entrypoint,
      };
      
      const response = await fetch(`${apiUrl}/repos/${repoId}/snapshot`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ snapshot }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      toast.success("Framework configuration updated");
      if (onSave) {
        onSave(editedInfo);
      }
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving configuration:", error);
      toast.error("Failed to save configuration");
    } finally {
      setIsSaving(false);
    }
  };

  // Auto-detect when modal opens
  if (open && !frameworkInfo && !isDetecting) {
    detectFramework();
  }

  const getConfidenceBadgeVariant = (confidence: string) => {
    switch (confidence) {
      case "high":
        return "default";
      case "medium":
        return "secondary";
      case "low":
        return "outline";
      default:
        return "outline";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Framework Detection</DialogTitle>
          <DialogDescription>
            Detected framework configuration for {repoName}
          </DialogDescription>
        </DialogHeader>

        {isDetecting ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Analyzing repository...</span>
          </div>
        ) : frameworkInfo && editedInfo ? (
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="framework" className="text-right">
                Framework
              </Label>
              <div className="col-span-3 flex items-center gap-2">
                <Input
                  id="framework"
                  value={editedInfo.name}
                  onChange={(e) =>
                    setEditedInfo({ ...editedInfo, name: e.target.value })
                  }
                />
                <Badge variant={getConfidenceBadgeVariant(frameworkInfo.confidence)}>
                  {frameworkInfo.confidence} confidence
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="port" className="text-right">
                Port
              </Label>
              <Input
                id="port"
                type="number"
                className="col-span-3"
                value={editedInfo.port}
                onChange={(e) =>
                  setEditedInfo({ ...editedInfo, port: parseInt(e.target.value) || 3000 })
                }
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="entrypoint" className="text-right">
                Entrypoint
              </Label>
              <Input
                id="entrypoint"
                className="col-span-3"
                value={editedInfo.entrypoint}
                onChange={(e) =>
                  setEditedInfo({ ...editedInfo, entrypoint: e.target.value })
                }
              />
            </div>

            {frameworkInfo.detected.dependencies.length > 0 && (
              <div className="grid grid-cols-4 items-start gap-4">
                <Label className="text-right pt-2">Detected from</Label>
                <div className="col-span-3 space-y-1">
                  {frameworkInfo.detected.dependencies.map((dep) => (
                    <Badge key={dep} variant="outline" className="mr-1">
                      {dep}
                    </Badge>
                  ))}
                  {frameworkInfo.detected.scripts.map((script) => (
                    <Badge key={script} variant="secondary" className="mr-1">
                      {script}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!editedInfo || isDetecting || isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Configuration"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 