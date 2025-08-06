import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Minus, Info, ChevronDown, ChevronRight } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { EnvVariable } from "./types";

interface EnvVariablesSectionProps {
  showEnvVariables: boolean;
  setShowEnvVariables: (show: boolean) => void;
  envVariables: EnvVariable[];
  setEnvVariables: (vars: EnvVariable[]) => void;
}

export function EnvVariablesSection({
  showEnvVariables,
  setShowEnvVariables,
  envVariables,
  setEnvVariables,
}: EnvVariablesSectionProps) {
  const addEnvVariable = () => {
    setEnvVariables([...envVariables, { key: "", value: "" }]);
  };

  const removeEnvVariable = (index: number) => {
    setEnvVariables(envVariables.filter((_, i) => i !== index));
  };

  const updateEnvVariable = (index: number, field: "key" | "value", value: string) => {
    const newVars = [...envVariables];
    if (newVars[index]) {
      newVars[index][field] = value;
    }
    setEnvVariables(newVars);
  };

  const handleEnvPaste = (e: React.ClipboardEvent<HTMLInputElement>, index: number) => {
    const pastedText = e.clipboardData.getData("text");
    
    // Check if pasted text contains multiple env vars (KEY=VALUE format)
    const lines = pastedText.split("\n").filter(line => line.trim());
    const envPattern = /^[A-Za-z_][A-Za-z0-9_]*=.*$/;
    
    const validEnvLines = lines.filter(line => envPattern.test(line.trim()));
    
    if (validEnvLines.length > 0) {
      e.preventDefault(); // Prevent default paste
      
      const parsedVars = validEnvLines.map(line => {
        const [key, ...valueParts] = line.trim().split("=");
        return { key: key?.trim() || "", value: valueParts.join("=").trim() };
      });
      
      // If pasting into an existing empty row, use it for the first var
      const currentVar = envVariables[index];
      let newVars = [...envVariables];
      let startIndex = 0;
      
      if (currentVar && !currentVar.key && !currentVar.value && parsedVars[0]) {
        // Use the current empty row for the first parsed var
        newVars[index] = parsedVars[0];
        startIndex = 1;
      }
      
      // Add remaining vars as new rows
      const additionalVars = parsedVars.slice(startIndex);
      if (additionalVars.length > 0) {
        // Insert after the current index
        newVars.splice(index + 1, 0, ...additionalVars);
      }
      
      setEnvVariables(newVars);
    }
  };

  return (
    <Card className="py-2">
      <Collapsible open={showEnvVariables} onOpenChange={setShowEnvVariables}>
        <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium cursor-pointer hover:text-foreground transition-colors w-full px-3 h-[var(--input-height)] text-left">
          {showEnvVariables ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          Environment Variables
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 pb-6 px-3 space-y-4">
            <div className="space-y-3">
              <div className="grid grid-cols-[1fr_1fr_40px] gap-2 text-sm text-muted-foreground mb-2">
                <div>Key</div>
                <div className="flex items-center gap-1">
                  Value
                  <Info className="h-3 w-3" />
                </div>
                <div></div>
              </div>
              {envVariables.map((envVar, index) => (
                <div key={index} className="grid grid-cols-[1fr_1fr_40px] gap-2">
                  <Input
                    placeholder="EXAMPLE_NAME"
                    value={envVar.key}
                    onChange={(e) => updateEnvVariable(index, "key", e.target.value)}
                    onPaste={(e) => handleEnvPaste(e, index)}
                    className="font-mono text-sm"
                  />
                  <Input
                    placeholder="value"
                    value={envVar.value}
                    onChange={(e) => updateEnvVariable(index, "value", e.target.value)}
                    onPaste={(e) => handleEnvPaste(e, index)}
                    className="font-mono text-sm"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeEnvVariable(index)}
                    disabled={envVariables.length === 1}
                    className="h-10 w-10"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            
            <Button
              type="button"
              variant="outline"
              onClick={addEnvVariable}
              className="w-fit"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add More
            </Button>
            
            <div className="text-sm text-muted-foreground">
              <span>Tip: Paste an .env above to populate the form. These environment variables will be treated as secrets. </span>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
} 