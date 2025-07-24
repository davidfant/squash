import { CurrentUserAvatar } from "@/components/layout/auth/avatar/CurrentUserAvatar";
import { SignInButton } from "@/components/layout/auth/SignInButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, useMutation } from "@/hooks/api";
import { convertStreamPartsToMessages } from "@/lib/convertStreamPartsToMessages";
import type { TextStreamPart } from "ai";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

export function LandingPage() {
  const [value, setValue] = useState("");
  const [parts, setParts] = useState<TextStreamPart<any>[]>([]);

  const messages = convertStreamPartsToMessages(parts);
  const navigate = useNavigate();
  const { t } = useTranslation("landing");

  console.log("XXX", parts, messages);

  const createProject = useMutation(api.projects.$post);

  return (
    <>
      <header>
        hypershape
        <CurrentUserAvatar
          fallback={<SignInButton>{t("startBuilding")}</SignInButton>}
        />
      </header>

      <Input value={value} onChange={(e) => setValue(e.target.value)} />
      <Button
        onClick={
          () =>
            createProject
              .mutateAsync({ json: { name: value } })
              .then((res) => navigate(`/projects/${res.id}`))
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
      <div>{parts.length}</div>
    </>
  );
}
