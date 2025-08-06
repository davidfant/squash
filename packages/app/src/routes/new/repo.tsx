import { api, useMutation, useQuery, type QueryOutput } from "@/hooks/api";
import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useSelectedRepoId } from "../landing";
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import type {
  ProviderData,
  FrameworkInfo,
  SelectedRepo,
  CurrentStep,
  EnvVariable,
} from "@/components/layout/repo/types";
import { RepositorySelector } from "@/components/layout/repo/RepositorySelector";
import { FrameworkConfiguration } from "@/components/layout/repo/FrameworkConfiguration";

function NewRepoForm({ provider }: { provider: ProviderData }) {
  const [selectedAccountId, setSelectedAccountId] = useState(
    provider.accounts[0]?.id
  );
  const [selectedRepoForImport, setSelectedRepoForImport] = useState<SelectedRepo | null>(null);
  const [currentStep, setCurrentStep] = useState<CurrentStep>("select-repo");
  const [isDetecting, setIsDetecting] = useState(false);
  const [frameworkInfo, setFrameworkInfo] = useState<FrameworkInfo | null>(null);
  const [editedInfo, setEditedInfo] = useState<FrameworkInfo | null>(null);

  const selectedAccount = provider.accounts.find(
    (a) => a.id === selectedAccountId
  );

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
        // @ts-ignore - API types need to be regenerated to include required snapshot parameter
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

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        {currentStep === "select-repo" && (
          <RepositorySelector
            provider={provider}
            selectedAccountId={selectedAccountId}
            setSelectedAccountId={setSelectedAccountId}
            onSelectRepo={handleImportClick}
            importPending={importRepo.isPending}
          />
        )}

        {currentStep === "configure-framework" && selectedRepoForImport && (
          <FrameworkConfiguration
            provider={provider}
            selectedAccount={selectedAccount}
            selectedRepo={selectedRepoForImport}
            isDetecting={isDetecting}
            frameworkInfo={frameworkInfo}
            editedInfo={editedInfo}
            setEditedInfo={setEditedInfo}
            onBack={handleBack}
            onConfirm={handleConfirmImport}
            importPending={importRepo.isPending}
          />
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
