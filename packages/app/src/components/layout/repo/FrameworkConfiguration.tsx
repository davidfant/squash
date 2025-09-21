import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  GitBranch,
  Loader2,
} from "lucide-react";
import { useState } from "react";
import { EnvVariablesSection } from "./EnvVariablesSection";
import {
  frameworks,
  getFrameworkDisplay,
  getFrameworkIcon,
} from "./FrameworkConstants";
import type {
  EnvVariable,
  FrameworkInfo,
  ProviderData,
  SelectedRepo,
} from "./types";

interface FrameworkConfigurationProps {
  provider: ProviderData;
  selectedAccount: any;
  selectedRepo: SelectedRepo;
  isDetecting: boolean;
  frameworkInfo: FrameworkInfo | null;
  editedInfo: FrameworkInfo | null;
  setEditedInfo: (info: FrameworkInfo | null) => void;
  onBack: () => void;
  onConfirm: () => void;
  importPending: boolean;
}

export function FrameworkConfiguration({
  provider,
  selectedAccount,
  selectedRepo,
  isDetecting,
  frameworkInfo,
  editedInfo,
  setEditedInfo,
  onBack,
  onConfirm,
  importPending,
}: FrameworkConfigurationProps) {
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [showEnvVariables, setShowEnvVariables] = useState(false);
  const [envVariables, setEnvVariables] = useState<EnvVariable[]>([
    { key: "", value: "" },
  ]);
  const [projectName, setProjectName] = useState(selectedRepo.name);

  return (
    <Card className="border-none shadow-xl bg-card/95 backdrop-blur">
      <CardHeader className="pb-8">
        <div className="rounded-lg bg-muted/50 p-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            disabled={isDetecting || importPending}
            className="h-8 w-8"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Importing from GitHub
          </span>
          <div className="flex items-center gap-2">
            <Avatar
              className="size-5"
              image={`https://github.com/${selectedAccount?.name}.png`}
              name={selectedAccount?.name}
            />
            <span className="text-sm font-medium">
              {selectedAccount?.name}/{selectedRepo.name}
            </span>
            <GitBranch className="size-3 text-muted-foreground ml-1" />
            <span className="text-sm text-muted-foreground">main</span>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isDetecting ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="mt-4 text-muted-foreground">
              Analyzing repository...
            </span>
            <span className="mt-2 text-sm text-muted-foreground">
              This may take a few moments
            </span>
          </div>
        ) : frameworkInfo && editedInfo ? (
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Choose where you want to create the project and give it a name.
            </p>

            <div className="space-y-6">
              {/* Team and Project Name Section */}
              <div className="flex items-start gap-3">
                <div className="flex-1 space-y-2">
                  <Label className="text-sm text-muted-foreground">Team</Label>
                  <Select defaultValue="personal">
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="personal">
                        <div className="flex items-center gap-2">
                          <Avatar className="size-5">
                            <AvatarImage
                              src={`https://github.com/${selectedAccount?.name}.png`}
                            />
                            <AvatarFallback>
                              {selectedAccount?.name?.[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span>{selectedAccount?.name || "Personal"}</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <span className="text-muted-foreground text-xl mt-9">/</span>

                <div className="flex-1 space-y-2">
                  <Label className="text-sm text-muted-foreground">
                    Project Name
                  </Label>
                  <Input
                    className="w-full"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                  />
                </div>
              </div>

              {/* Framework Preset */}
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">
                  Framework Preset
                </Label>
                <Select
                  value={editedInfo.name}
                  onValueChange={(value) =>
                    setEditedInfo({ ...editedInfo, name: value })
                  }
                >
                  <SelectTrigger className="w-full">
                    {editedInfo.name ? (
                      <div className="flex items-center gap-2 flex-1">
                        {getFrameworkIcon(editedInfo.name) ? (
                          <img
                            src={getFrameworkIcon(editedInfo.name)!}
                            alt={editedInfo.name}
                            className="h-5 w-5"
                          />
                        ) : (
                          <span className="text-lg">🔧</span>
                        )}
                        <span>{getFrameworkDisplay(editedInfo.name)}</span>
                      </div>
                    ) : (
                      <SelectValue placeholder="Select a framework" />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {!getFrameworkIcon(editedInfo.name) && (
                      <SelectItem value={editedInfo.name}>
                        <div className="flex items-center gap-2">
                          <span className="text-lg">🔧</span>
                          <span>{editedInfo.name}</span>
                        </div>
                      </SelectItem>
                    )}
                    {frameworks.map((framework) => (
                      <SelectItem key={framework.value} value={framework.value}>
                        <div className="flex items-center gap-2">
                          <img
                            src={framework.icon}
                            alt={framework.display}
                            className="h-5 w-5"
                          />
                          <span>{framework.display}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Root Directory */}
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">
                  Root Directory
                </Label>
                <div className="flex gap-2">
                  <Input className="w-full" value="./" placeholder="./" />
                  <Button variant="outline">Edit</Button>
                </div>
              </div>

              {/* Build and Output Settings */}
              <Card className="py-2">
                <Collapsible
                  open={showAdvancedSettings}
                  onOpenChange={setShowAdvancedSettings}
                >
                  <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium cursor-pointer hover:text-foreground transition-colors w-full px-3 h-[var(--input-height)] text-left">
                    {showAdvancedSettings ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    Build and Output Settings
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="space-y-4 pt-0 pb-6 px-3">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm text-muted-foreground">
                            Build Command
                          </Label>
                          <Switch />
                        </div>
                        <Input
                          className="w-full font-mono text-sm"
                          value={editedInfo.entrypoint}
                          onChange={(e) =>
                            setEditedInfo({
                              ...editedInfo,
                              entrypoint: e.target.value,
                            })
                          }
                          placeholder="npm run build or next build"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm text-muted-foreground">
                            Output Directory
                          </Label>
                          <Switch />
                        </div>
                        <Input
                          className="w-full font-mono text-sm"
                          value="out"
                          placeholder="Next.js default"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm text-muted-foreground">
                            Install Command
                          </Label>
                          <Switch />
                        </div>
                        <Input
                          className="w-full font-mono text-sm"
                          value="npm install"
                          placeholder="yarn install, pnpm install, npm install, or bun install"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm text-muted-foreground">
                            Development Server Port
                          </Label>
                        </div>
                        <Input
                          className="w-full"
                          type="number"
                          value={editedInfo.port}
                          onChange={(e) =>
                            setEditedInfo({
                              ...editedInfo,
                              port: parseInt(e.target.value) || 3000,
                            })
                          }
                        />
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>

              {/* Environment Variables */}
              <EnvVariablesSection
                showEnvVariables={showEnvVariables}
                setShowEnvVariables={setShowEnvVariables}
                envVariables={envVariables}
                setEnvVariables={setEnvVariables}
              />
            </div>

            {/* Deploy Button */}
            <div className="pt-4">
              <Button
                onClick={onConfirm}
                disabled={!editedInfo || importPending}
                className="w-full text-base"
                size="lg"
              >
                {importPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deploying...
                  </>
                ) : (
                  "Deploy"
                )}
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
