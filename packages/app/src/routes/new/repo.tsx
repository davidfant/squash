import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, useMutation, useQuery, type QueryOutput } from "@/hooks/api";
import { ExternalLink, GitBranch, Lock, Unlock, Loader2, ArrowLeft, ArrowRight, ChevronDown, ChevronRight, Rocket, Plus, Minus, Info } from "lucide-react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useSelectedRepoId } from "../landing";
import { toast } from "@/components/ui/sonner";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

type ProviderData = QueryOutput<
  (typeof api.repos.providers)[":providerId"]["$get"]
>;

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

function NewRepoForm({ provider }: { provider: ProviderData }) {
  const [selectedAccountId, setSelectedAccountId] = useState(
    provider.accounts[0]?.id
  );
  const [selectedRepoForImport, setSelectedRepoForImport] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [currentStep, setCurrentStep] = useState<"select-repo" | "configure-framework">("select-repo");
  const [isDetecting, setIsDetecting] = useState(false);
  const [frameworkInfo, setFrameworkInfo] = useState<FrameworkInfo | null>(null);
  const [editedInfo, setEditedInfo] = useState<FrameworkInfo | null>(null);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [showEnvVariables, setShowEnvVariables] = useState(false);
  const [envVariables, setEnvVariables] = useState<{ key: string; value: string }[]>([
    { key: "", value: "" }
  ]);

  const selectedAccount = provider.accounts.find(
    (a) => a.id === selectedAccountId
  );

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

  const navigate = useNavigate();
  const [, setSelectedRepoId] = useSelectedRepoId();
  const importRepo = useMutation(
    api.repos.providers[":providerId"].repos.$post,
    {
      onSuccess: (repo) => {
        setSelectedRepoId(repo.id);
        toast.success(`Repository "${selectedRepoForImport?.name}" imported successfully`);
        navigate(`/`);
      },
      onError: () => {
        toast.error("Failed to import repository");
      },
    }
  );

  const handleImportClick = async (repo: any) => {
    setSelectedRepoForImport({
      id: repo.id,
      name: repo.name,
    });
    setCurrentStep("configure-framework");
    
    // Start detecting framework
    setIsDetecting(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8787";
      const response = await fetch(
        `${apiUrl}/repos/providers/${provider.id}/detect-framework`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ repoId: repo.id }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setFrameworkInfo(data.framework);
      setEditedInfo(data.framework);
    } catch (error) {
      console.error("Error detecting framework:", error);
      toast.error("Failed to detect framework");
      setCurrentStep("select-repo");
      setSelectedRepoForImport(null);
    } finally {
      setIsDetecting(false);
    }
  };

  const handleConfirmImport = () => {
    if (selectedRepoForImport && editedInfo) {
      const snapshot = {
        type: "docker" as const,
        port: editedInfo.port,
        image: "node:20-alpine",
        entrypoint: editedInfo.entrypoint,
      };
      
      importRepo.mutate({
        param: { providerId: provider.id },
        // @ts-ignore - snapshot parameter was just added to the API
        json: { 
          repoId: selectedRepoForImport.id,
          snapshot: snapshot
        } as any,
      });
    }
  };

  const handleBack = () => {
    setCurrentStep("select-repo");
    setSelectedRepoForImport(null);
    setFrameworkInfo(null);
    setEditedInfo(null);
  };

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

  // Framework icons mapping
  const frameworkIcons: Record<string, string> = {
    "Next.js": "▲",
    "React": "⚛️",
    "Vue": "🟢",
    "Angular": "🔴",
    "Nuxt": "🟩",
    "SvelteKit": "🟠",
    "Remix": "💿",
    "Gatsby": "🟣",
    "Astro": "🚀",
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        {currentStep === "select-repo" && (
          <Card>
        <CardHeader>
          <CardTitle>Import Git Repository</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label className="text-sm font-medium mb-2 block">
              Select Account
            </Label>
            <Select
              value={selectedAccountId}
              onValueChange={setSelectedAccountId}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose an account" />
              </SelectTrigger>
              <SelectContent>
                {provider.accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    <div className="flex items-center gap-2">
                      <Avatar className="size-5">
                        <AvatarImage src={account.avatarUrl} alt={account.name} />
                        <AvatarFallback>
                          {account.name[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span>{account.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedAccount && (
            <div className="space-y-3">
              <h3 className="font-medium">
                Repositories ({selectedAccount.repos.length})
              </h3>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {selectedAccount.repos.map((repo) => (
                  <div
                    key={repo.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <GitBranch className="size-4 text-muted-foreground" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{repo.name}</span>
                          {repo.private ? (
                            <Lock className="size-3 text-muted-foreground" />
                          ) : (
                            <Unlock className="size-3 text-muted-foreground" />
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Created {new Date(repo.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    {repo.imported ? (
                      <Button size="sm" disabled>
                        Imported
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleImportClick(repo)}
                        disabled={importRepo.isPending}
                      >
                            Select
                            <ArrowRight className="ml-1 h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="text-center text-sm text-muted-foreground">
            Missing Git repository?{" "}
            <a
              href={`${import.meta.env.VITE_API_URL}/integrations/github/connect`}
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              Adjust GitHub App Permissions
              <ExternalLink className="size-3" />
            </a>
          </div>
        </CardContent>
      </Card>
        )}

        {currentStep === "configure-framework" && selectedRepoForImport && (
          <Card className="border-none shadow-xl bg-card/95 backdrop-blur">
            <CardHeader className="pb-8">
              <div className="rounded-lg bg-muted/50 p-3 flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleBack}
                  disabled={isDetecting || importRepo.isPending}
                  className="h-8 w-8"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">Importing from GitHub</span>
                <div className="flex items-center gap-2">
                  <Avatar className="size-5">
                    <AvatarImage src={`https://github.com/${selectedAccount?.name}.png`} alt={selectedAccount?.name} />
                    <AvatarFallback>
                      {selectedAccount?.name?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{selectedAccount?.name}/{selectedRepoForImport.name}</span>
                  <GitBranch className="size-3 text-muted-foreground ml-1" />
                  <span className="text-sm text-muted-foreground">main</span>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              {isDetecting ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <span className="mt-4 text-muted-foreground">Analyzing repository...</span>
                  <span className="mt-2 text-sm text-muted-foreground">This may take a few moments</span>
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
                                  <AvatarImage src={`https://github.com/${selectedAccount?.name}.png`} />
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
                        <Label className="text-sm text-muted-foreground">Project Name</Label>
                        <Input
                          className="w-full"
                          value={selectedRepoForImport.name}
                          onChange={(e) => setSelectedRepoForImport({
                            ...selectedRepoForImport,
                            name: e.target.value
                          })}
                        />
                      </div>
                    </div>

                    {/* Framework Preset */}
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">Framework Preset</Label>
                      <Select 
                        value={editedInfo.name}
                        onValueChange={(value) => setEditedInfo({ ...editedInfo, name: value })}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {!frameworkIcons[editedInfo.name] && (
                            <SelectItem value={editedInfo.name}>
                              <div className="flex items-center gap-2">
                                <span className="text-lg">🔧</span>
                                <span>{editedInfo.name}</span>
                              </div>
                            </SelectItem>
                          )}
                          {Object.entries(frameworkIcons).map(([framework, icon]) => (
                            <SelectItem key={framework} value={framework}>
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{icon}</span>
                                <span>{framework}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Root Directory */}
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">Root Directory</Label>
                      <div className="flex gap-2">
                        <Input
                          className="w-full"
                          value="./"
                          placeholder="./"
                        />
                        <Button variant="outline">
                          Edit
                        </Button>
                      </div>
                    </div>

                    {/* Build and Output Settings */}
                    <Card className="py-2">
                      <Collapsible open={showAdvancedSettings} onOpenChange={setShowAdvancedSettings}>
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
                                <Label className="text-sm text-muted-foreground">Build Command</Label>
                                <Switch />
                              </div>
                              <Input
                                className="w-full font-mono text-sm"
                                value={editedInfo.entrypoint}
                                onChange={(e) => setEditedInfo({ ...editedInfo, entrypoint: e.target.value })}
                                placeholder="npm run build or next build"
                              />
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label className="text-sm text-muted-foreground">Output Directory</Label>
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
                                <Label className="text-sm text-muted-foreground">Install Command</Label>
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
                                <Label className="text-sm text-muted-foreground">Development Server Port</Label>
                              </div>
                              <Input
                                className="w-full"
                                type="number"
                                value={editedInfo.port}
                                onChange={(e) => setEditedInfo({ ...editedInfo, port: parseInt(e.target.value) || 3000 })}
                              />
                            </div>
                          </CardContent>
                        </CollapsibleContent>
                      </Collapsible>
                    </Card>

                    {/* Environment Variables */}
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
                              {/* <a href="#" className="text-primary hover:underline">
                                Learn more
                                <ExternalLink className="inline ml-1 h-3 w-3" />
                              </a> */}
                            </div>
                          </CardContent>
                        </CollapsibleContent>
                      </Collapsible>
                    </Card>
                  </div>

                  {/* Deploy Button */}
                  <div className="pt-4">
                    <Button 
                      onClick={handleConfirmImport}
                      disabled={!editedInfo || importRepo.isPending}
                      className="w-full text-base"
                      size="lg"
                    >
                      {importRepo.isPending ? (
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
        )}
      </div>
    </div>
  );
}

function NewRepo({ providerId }: { providerId: string }) {
  const providers = useQuery(api.repos.providers.$get, { params: {} });
  const provider = useQuery(api.repos.providers[":providerId"].$get, {
    params: { providerId },
    enabled: !!providerId,
  });

  if (!providers.data || !provider.data) {
    return <div>Loading...</div>;
  }

  return <NewRepoForm provider={provider.data} />;
}

export function NewRepoFromProvider() {
  const { providerId } = useParams();
  return <NewRepo providerId={providerId!} />;
}

export function NewRepoPage() {
  const providers = useQuery(api.repos.providers.$get, { params: {} });
  if (!providers.data) {
    return <div>Loading...</div>;
  } else if (!providers.data.length) {
    return (
      <a href={`${import.meta.env.VITE_API_URL}/integrations/github/connect`}>
        <Button>Connect Github</Button>
      </a>
    );
  } else {
    return <NewRepo providerId={providers.data[0]!.id} />;
  }
}
