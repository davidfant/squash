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
import { api, useQuery, type QueryOutput } from "@/hooks/api";
import { ExternalLink, GitBranch, Lock, Unlock } from "lucide-react";
import { useState } from "react";
import { useParams } from "react-router";

type ProviderData = QueryOutput<
  (typeof api.repos.providers)[":providerId"]["$get"]
>;

function NewRepoForm({ provider }: { provider: ProviderData }) {
  const [selectedAccountId, setSelectedAccountId] = useState(
    provider.accounts[0]?.id
  );

  const selectedAccount = provider.accounts.find(
    (a) => a.id === selectedAccountId
  );

  return (
    <Card className="max-w-2xl mx-auto">
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
                  className="flex items-center justify-between p-3 border rounded-lg"
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
                    <Button size="sm">Import</Button>
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
