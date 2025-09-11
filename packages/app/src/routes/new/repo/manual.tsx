import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { api, useMutation } from "@/hooks/api";
import { useState } from "react";
import { useNavigate } from "react-router";

export function NewRepoManualPage() {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [defaultBranch, setDefaultBranch] = useState("master");

  const navigate = useNavigate();

  const template = "replicator-vite-ts";
  const version = "v0.0.5";

  const createRepo = useMutation(api.repos.$post, {
    onSuccess: (repo) => {
      toast.success(`Repository "${name}" created successfully`);
      navigate(`/repos/${repo.id}`);
    },
    onError: () => toast.error("Failed to create repository"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !url.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    createRepo.mutate({
      json: {
        name: name.trim(),
        url: url.trim(),
        defaultBranch: defaultBranch.trim(),
        snapshot: {
          type: "docker",
          image: `registry.fly.io/squash-template:${template}-${version}`,
          port: 5173,
          entrypoint: "pnpm dev --host 0.0.0.0 --port $PORT",
          workdir: "/root/repo",
        },
      },
    });
  };

  return (
    <div className="max-w-md mx-auto mt-8 p-6 border rounded-lg">
      <h2 className="text-2xl font-bold mb-6">Create New Repository</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Repository Name *</Label>
          <Input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="my-awesome-project"
            required
          />
        </div>

        <div>
          <Label htmlFor="url">Repository URL *</Label>
          <Input
            id="url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://github.com/username/repo"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="defaultBranch">Default Branch</Label>
          <Input
            id="defaultBranch"
            type="text"
            value={defaultBranch}
            onChange={(e) => setDefaultBranch(e.target.value)}
            placeholder="master"
          />
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={createRepo.isPending}
        >
          {createRepo.isPending ? "Creating..." : "Create Repository"}
        </Button>
      </form>
    </div>
  );
}
