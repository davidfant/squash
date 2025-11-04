import { FeatureCardGrid } from "@/components/blocks/feature/grid";
import { RepoCard } from "@/components/blocks/feature/repo-card";
import { ChatInput } from "@/components/layout/chat/input/ChatInput";
import {
  ChatInputProvider,
  type ChatInputValue,
} from "@/components/layout/chat/input/context";
import { MainLayout } from "@/components/layout/main/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/components/ui/sonner";
import { Textarea } from "@/components/ui/textarea";
import { api, useMutation, useQuery } from "@/hooks/api";
import { useAuth, useClerk } from "@clerk/clerk-react";
import { ArrowRightIcon } from "lucide-react";
import { usePostHog } from "posthog-js/react";
import { forwardRef, memo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useLocalStorage } from "usehooks-ts";
import { FlowingGradientBackground } from "./components/flowing-gradient-background";
import { usePlaceholder } from "./usePlaceholder";

const MemoizedTextarea = memo(Textarea);
const TextareaWithPlaceholder = memo(
  forwardRef<
    React.ComponentRef<typeof Textarea>,
    React.ComponentProps<typeof Textarea>
  >((props, ref) => {
    const placeholder = usePlaceholder();
    // const [isFocused, setIsFocused] = useState(false);

    const isEmpty = !props.value || props.value === "";
    const showPlaceholder = isEmpty; // && !isFocused;

    return (
      <div className="relative">
        <MemoizedTextarea
          {...props}
          ref={ref}
          // onFocus={(e) => {
          //   setIsFocused(true);
          //   props.onFocus?.(e);
          // }}
          // onBlur={(e) => {
          //   setIsFocused(false);
          //   props.onBlur?.(e);
          // }}
          // Remove placeholder prop since we're using overlay
          placeholder={undefined}
        />
        {showPlaceholder && (
          <div
            className="absolute inset-0 pointer-events-none flex flex-wrap items-start px-3 py-2 text-muted-foreground text-sm"
            aria-hidden="true"
          >
            {placeholder}
          </div>
        )}
      </div>
    );
  })
);
TextareaWithPlaceholder.displayName = "TextareaWithPlaceholder";

const popularToolkits: Array<{
  id: string;
  name: string;
  logoUrl: string;
}> = [
  {
    id: "facebook",
    name: "Facebook",
    logoUrl: "https://logos.composio.dev/api/facebook",
  },
  {
    id: "gmail",
    name: "Gmail",
    logoUrl: "https://logos.composio.dev/api/gmail",
  },
  {
    id: "googledrive",
    name: "Google Drive",
    logoUrl: "https://logos.composio.dev/api/googledrive",
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    logoUrl: "https://logos.composio.dev/api/linkedin",
  },
  {
    id: "slack",
    name: "Slack",
    logoUrl: "https://logos.composio.dev/api/slack",
  },
  {
    id: "twitter",
    name: "Twitter",
    logoUrl: "https://logos.composio.dev/api/twitter",
  },
];

function Content() {
  const navigate = useNavigate();
  const repos = useQuery(api.repos.featured.$get, { params: {} });
  const [toolkitId, setToolkitId] = useState<string | null>(null);

  console.log("public", repos.data);
  // const repos = useRepos();

  const [chatInitialValue, setChatInitialValue] =
    useLocalStorage<ChatInputValue>("BranchFeed.chatInitialValue", {
      text: "",
      files: [],
    });

  const createRepo = useMutation(api.repos.$post, {
    onError: () => toast.error("Failed to create repository"),
  });

  const isSignedIn = useAuth().isSignedIn;
  const posthog = usePostHog();
  const clerk = useClerk();
  const handleSubmit = async (content: ChatInputValue) => {
    if (isSignedIn) {
      const newRepo = await createRepo.mutateAsync({
        json: {
          template: "base-vite-trpc-cloudflare-worker-ts",
          message: {
            parts: [
              ...(content.text
                ? [{ type: "text" as const, text: content.text }]
                : []),
              ...(content.files ?? []),
            ],
          },
        },
      });

      setChatInitialValue({ text: "", files: [] });
      navigate(`/apps/${newRepo.branches[0]!.id}`);
    } else {
      posthog?.capture("on_submit_unauthed_chat_input", { content });
      clerk.openWaitlist();
      // TODO: open sign in modal
    }
  };

  return (
    <div className="relative">
      {!isSignedIn && (
        <div className="absolute inset-0 opacity-20 blur-md will-change-auto 2xl:blur-2xl z-0">
          <FlowingGradientBackground scale={3} />
        </div>
      )}
      <div className="relative z-1">
        <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-2 md:px-6 py-24 gap-32">
          <section className="flex flex-col items-center gap-12 text-center">
            {/* <Badge variant="secondary" className="px-3 py-1.5 rounded-full">
            Build anything with AI
          </Badge> */}
            <div className="space-y-4">
              <h1 className="text-balance text-4xl font-light tracking-tight sm:text-5xl">
                Integrate your apps
              </h1>
              <p className="max-w-2xl text-balance text-xl text-muted-foreground">
                Connect 500+ apps with enterprise-grade integrations
              </p>
            </div>

            <ChatInputProvider initialValue={chatInitialValue}>
              <div className="w-full max-w-2xl">
                <ChatInput
                  clearOnSubmit={false}
                  onSubmit={handleSubmit}
                  submitting={createRepo.isPending}
                  minRows={3}
                  maxRows={10}
                  Textarea={TextareaWithPlaceholder as any}
                  disabled={createRepo.isPending}
                />

                {/* <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Link to="/new/repo">
                  <Suggestion suggestion="Import from Github" size="default">
                    <SiGithub />
                    Import from Github
                  </Suggestion>
                </Link>
              </div> */}
              </div>
            </ChatInputProvider>
          </section>

          <Card className="shadow-none">
            <CardContent className="space-y-2">
              <div className="flex justify-between items-center">
                <h2 className="text-lg">Featured Templates</h2>
                <Link to="/templates">
                  <Button variant="ghost" size="sm">
                    View all <ArrowRightIcon />
                  </Button>
                </Link>
              </div>
              {/* <Suggestions className="mb-4">
                <Suggestion
                  suggestion="All"
                  variant={toolkitId === null ? "secondary" : "outline"}
                  className="border min-w-16"
                  onClick={() => setToolkitId(null)}
                >
                  Show All
                </Suggestion>
                {popularToolkits.map((toolkit) => (
                  <Suggestion
                    suggestion={toolkit.name}
                    variant={toolkitId === toolkit.id ? "secondary" : "outline"}
                    className="border min-w-16"
                    onClick={() => setToolkitId(toolkit.id)}
                  >
                    <img
                      src={toolkit.logoUrl}
                      alt={toolkit.name}
                      className="size-4"
                    />
                    {toolkit.name}
                  </Suggestion>
                ))}
              </Suggestions> */}
              <FeatureCardGrid
                children={repos.data?.map((repo, index) => (
                  <RepoCard key={repo.id} repo={repo} index={index} />
                ))}
              />
            </CardContent>
          </Card>

          {/* <RecentBranchesGrid /> */}
        </main>
      </div>
    </div>
  );
}

export const NewPage = () => (
  <MainLayout>
    <Content />
  </MainLayout>
);
