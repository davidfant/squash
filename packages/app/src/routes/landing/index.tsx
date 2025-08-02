import { CurrentUserAvatar } from "@/components/layout/auth/avatar/CurrentUserAvatar";
import { SignInButton } from "@/components/layout/auth/SignInButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, useMutation, useQuery } from "@/hooks/api";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

export function LandingPage() {
  const [value, setValue] = useState("");
  const navigate = useNavigate();
  const { t } = useTranslation("landing");

  const repos = useQuery(api.repos.$get, { params: {} });

  // const createProject = useMutation(api.projects.$post);
  const createThread = useMutation(api.threads.$post);

  return (
    <>
      <header>
        hypershape
        <CurrentUserAvatar
          fallback={<SignInButton>{t("startBuilding")}</SignInButton>}
        />
      </header>

      {repos.data?.map((repo) => (
        <div key={repo.id}>{repo.name}</div>
      ))}
      <a href={`${import.meta.env.VITE_API_URL}/integrations/github/connect`}>
        <Button>Connect Github</Button>
      </a>

      <Input value={value} onChange={(e) => setValue(e.target.value)} />
      <Button
        onClick={
          async () => {
            const thread = await createThread.mutateAsync({
              json: [{ type: "text", text: value }],
            });
            // const project = await createProject.mutateAsync({
            //   json: { name: value, threadId: thread.id },
            // });

            // await navigate(`/projects/${project.id}`);
          }
          // createProject
          //   .mutateAsync({ json: { name: value } })
          //   .then((res) => navigate(`/projects/${res.id}`))
          // sseStream({
          //   endpoint: "chat",
          //   message: {
          //     id: "1",
          //     role: "user",
          //     content: value,
          //     parts: [{ type: "text", text: value }],
          //   },
          //   onEvent: (chunk) => setParts((prev) => [...prev, chunk]),
          // })
        }
      >
        Send
      </Button>
    </>
  );
}
