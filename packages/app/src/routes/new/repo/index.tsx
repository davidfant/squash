import { FrameworkConfiguration } from "@/components/layout/repo/FrameworkConfiguration";
import { RepositorySelector } from "@/components/layout/repo/RepositorySelector";
import type {
  CurrentStep,
  FrameworkInfo,
  ProviderData,
  SelectedRepo,
} from "@/components/layout/repo/types";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { api, useMutation, useQuery } from "@/hooks/api";
import { useState } from "react";
import { useNavigate, useParams } from "react-router";

function NewRepoForm({ provider }: { provider: ProviderData }) {
  const [selectedAccountId, setSelectedAccountId] = useState(
    provider.accounts[0]?.id
  );
  const [selectedRepoForImport, setSelectedRepoForImport] =
    useState<SelectedRepo | null>(null);
  const [currentStep, setCurrentStep] = useState<CurrentStep>("select-repo");
  const [isDetecting, setIsDetecting] = useState(false);
  const [frameworkInfo, setFrameworkInfo] = useState<FrameworkInfo | null>(
    null
  );
  const [editedInfo, setEditedInfo] = useState<FrameworkInfo | null>(null);

  const selectedAccount = provider.accounts.find(
    (a) => a.id === selectedAccountId
  );

  const navigate = useNavigate();
  const importRepo = useMutation(
    api.repos.providers[":providerId"].repos.$post,
    {
      onSuccess: (repo) => {
        toast.success(
          `Repository "${selectedRepoForImport?.name}" imported successfully`
        );
        navigate(`/repos/${repo.id}`);
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
      const apiUrl = import.meta.env.VITE_API_URL;
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
      importRepo.mutate({
        param: { providerId: provider.id },
        json: {
          repoId: selectedRepoForImport.id,
          snapshot: {
            type: "docker",
            port: editedInfo.port,
            image: "node:20-alpine",
            cwd: "/",
            env: {},
            tasks: {
              install: [],
              dev: {
                id: "dev",
                title: "Start development server",
                type: "command",
                command: editedInfo.entrypoint,
              },
              build: [],
            },
          },
        },
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
