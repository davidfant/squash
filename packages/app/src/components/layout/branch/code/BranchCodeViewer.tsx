import { useEffect, useMemo, useState } from "react";

import {
  CodeBlock,
  CodeBlockContent,
  CodeBlockCopyButton,
} from "@/components/ai-elements/code-block";
import { useBranchContext } from "@/components/layout/branch/context";
import { getFileIcon } from "@/components/layout/chat/message/FileBadge";
import { Markdown } from "@/components/layout/Markdown";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { api, useQuery } from "@/hooks/api";
import { cn } from "@/lib/utils";
import { ChevronRight, File as FileIcon /* , Folder */ } from "lucide-react";

type FileTreeFile = {
  type: "file";
  name: string;
  path: string;
};

type FileTreeDirectory = {
  type: "directory";
  name: string;
  path: string;
  children: FileTreeNode[];
};

type FileTreeNode = FileTreeDirectory | FileTreeFile;

type FileContentState =
  | { status: "idle"; path: string | null }
  | { status: "loading"; path: string }
  | { status: "error"; path: string; error: string }
  | {
      status: "ready";
      path: string;
      contentType: string;
      size: number;
      mode: "text" | "markdown" | "image" | "video" | "fallback-text";
      text?: string;
      objectUrl?: string;
    };

const textLikeExtensions = new Set([
  "js",
  "jsx",
  "ts",
  "tsx",
  "json",
  "md",
  "mdx",
  "txt",
  "html",
  "css",
  "scss",
  "sass",
  "less",
  "yml",
  "yaml",
  "toml",
  "rs",
  "py",
  "go",
  "java",
  "c",
  "h",
  "cpp",
  "sh",
  "sql",
  "xml",
  "csv",
  "env",
]);

function isTextLike(contentType: string, path: string) {
  if (contentType.startsWith("text/")) return true;
  if (contentType.includes("json")) return true;
  if (contentType.includes("javascript")) return true;
  const ext = getExtension(path);
  return !!ext && textLikeExtensions.has(ext);
}

function isImage(contentType: string, path: string) {
  if (contentType.startsWith("image/")) return true;
  const ext = getExtension(path);
  return ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext);
}

function isVideo(contentType: string, path: string) {
  if (contentType.startsWith("video/")) return true;
  const ext = getExtension(path);
  return ["mp4", "webm", "ogg", "mov"].includes(ext);
}

const languageMap: Record<string, string> = {
  js: "javascript",
  jsx: "jsx",
  ts: "typescript",
  tsx: "tsx",
  json: "json",
  md: "markdown",
  mdx: "markdown",
  html: "html",
  css: "css",
  scss: "scss",
  sass: "sass",
  less: "less",
  yml: "yaml",
  yaml: "yaml",
  py: "python",
  go: "go",
  rs: "rust",
  java: "java",
  c: "c",
  h: "c",
  cpp: "cpp",
  sh: "bash",
  sql: "sql",
  xml: "xml",
};

function getExtension(path: string): string {
  const segments = path.split("/");
  const name = segments.pop() ?? "";
  const parts = name.split(".");
  if (parts.length <= 1) return "";
  return parts.pop()!.toLowerCase();
}

function buildFileTree(files: string[]): FileTreeNode[] {
  const root: FileTreeDirectory = {
    type: "directory",
    name: "",
    path: "",
    children: [],
  };

  const ensureDirectory = (
    parent: FileTreeDirectory,
    name: string
  ): FileTreeDirectory => {
    const path = parent.path ? `${parent.path}/${name}` : name;
    const existing = parent.children.find(
      (child): child is FileTreeDirectory =>
        child.type === "directory" && child.name === name
    );
    if (existing) return existing;
    const directory: FileTreeDirectory = {
      type: "directory",
      name,
      path,
      children: [],
    };
    parent.children.push(directory);
    parent.children.sort((a, b) => a.name.localeCompare(b.name));
    return directory;
  };

  const addFile = (parent: FileTreeDirectory, name: string, path: string) => {
    parent.children.push({
      type: "file",
      name,
      path,
    });
    parent.children.sort((a, b) => {
      if (a.type === "directory" && b.type === "file") return -1;
      if (a.type === "file" && b.type === "directory") return 1;
      return a.name.localeCompare(b.name);
    });
  };

  for (const file of files) {
    const parts = file.split("/");
    let current = root;
    parts.forEach((segment, index) => {
      const isFile = index === parts.length - 1;
      if (isFile) {
        addFile(current, segment, file);
      } else {
        current = ensureDirectory(current, segment);
      }
    });
  }

  return root.children;
}

export function BranchCodeViewer() {
  const { branch } = useBranchContext();
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [content, setContent] = useState<FileContentState>({
    status: "idle",
    path: null,
  });

  const filesQuery = useQuery(api.branches[":branchId"].preview.fs.$get, {
    params: { branchId: branch.id },
  });

  const tree = useMemo(() => {
    if (!filesQuery.data?.files?.length) return [];
    return buildFileTree(filesQuery.data.files);
  }, [filesQuery.data?.files]);

  // Select the first file once available
  useEffect(() => {
    if (!selectedFile && filesQuery.data?.files?.length) {
      setSelectedFile(filesQuery.data.files[0]!);
      const initialPath = filesQuery.data.files[0]!;
      const segments = initialPath.split("/").slice(0, -1);
      if (segments.length) {
        setExpanded(
          new Set(
            segments.map((_, index, arr) => arr.slice(0, index + 1).join("/"))
          )
        );
      }
    }
  }, [filesQuery.data?.files, selectedFile]);

  // Clean up object URLs
  useEffect(() => {
    return () => {
      if (content.status === "ready" && content.objectUrl) {
        URL.revokeObjectURL(content.objectUrl);
      }
    };
  }, [content]);

  useEffect(() => {
    if (!selectedFile) {
      setContent({ status: "idle", path: null });
      return;
    }

    const target = selectedFile;
    let cancelled = false;
    setContent({ status: "loading", path: target });

    const load = async () => {
      try {
        const res = await api.branches[":branchId"].preview.fs.content.$get({
          param: { branchId: branch.id },
          query: { path: target },
        });

        if (!res.ok) {
          throw new Error(`Failed to load file (${res.status})`);
        }

        const contentType =
          res.headers.get("content-type") ?? "application/octet-stream";
        const buffer = await res.arrayBuffer();
        if (cancelled) return;

        const size = buffer.byteLength;
        const ext = getExtension(target);
        const isMarkdownFile =
          ext === "md" || ext === "mdx" || contentType.includes("markdown");
        const treatAsText = isMarkdownFile || isTextLike(contentType, target);

        if (treatAsText) {
          const text = new TextDecoder().decode(buffer);
          if (!cancelled) {
            setContent({
              status: "ready",
              path: target,
              contentType,
              size,
              mode: isMarkdownFile ? "markdown" : "text",
              text,
            });
          }
          return;
        }

        if (isImage(contentType, target)) {
          const blob = new Blob([buffer], { type: contentType });
          const objectUrl = URL.createObjectURL(blob);
          if (!cancelled) {
            setContent({
              status: "ready",
              path: target,
              contentType,
              size,
              mode: "image",
              objectUrl,
            });
          } else {
            URL.revokeObjectURL(objectUrl);
          }
          return;
        }

        if (isVideo(contentType, target)) {
          const blob = new Blob([buffer], { type: contentType });
          const objectUrl = URL.createObjectURL(blob);
          if (!cancelled) {
            setContent({
              status: "ready",
              path: target,
              contentType,
              size,
              mode: "video",
              objectUrl,
            });
          } else {
            URL.revokeObjectURL(objectUrl);
          }
          return;
        }

        const text = new TextDecoder().decode(buffer);
        let objectUrl: string | undefined;
        if (buffer.byteLength) {
          objectUrl = URL.createObjectURL(
            new Blob([buffer], { type: contentType })
          );
        }
        if (!cancelled) {
          setContent({
            status: "ready",
            path: target,
            contentType,
            size,
            mode: "fallback-text",
            text,
            objectUrl,
          });
        } else if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
        }
      } catch (error) {
        if (!cancelled) {
          setContent({
            status: "error",
            path: target,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [branch.id, selectedFile]);

  const toggleDirectory = (path: string, open: boolean) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (open) {
        next.add(path);
      } else {
        next.delete(path);
      }
      return next;
    });
  };

  const renderTree = (nodes: FileTreeNode[], depth = 0) => {
    return nodes.map((node) => {
      if (node.type === "directory") {
        const isOpen = expanded.has(node.path);
        return (
          <div key={node.path}>
            <Collapsible
              open={isOpen}
              onOpenChange={(open) => toggleDirectory(node.path, open)}
              className="group/collapsible"
            >
              <CollapsibleTrigger
                style={{ paddingLeft: 8 + depth * 12 }}
                className={cn(
                  "flex h-9 w-full items-center gap-2 rounded-md pr-2 text-sm hover:bg-muted",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                )}
              >
                <ChevronRight
                  className={cn(
                    "size-4 transition-transform text-muted-foreground",
                    isOpen && "rotate-90"
                  )}
                />
                {/* <Folder className="size-4 text-muted-foreground" /> */}
                <span className="truncate">{node.name}</span>
              </CollapsibleTrigger>
              <CollapsibleContent className="pl-4">
                <div className="flex flex-col">
                  {renderTree(node.children, depth + 1)}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        );
      }

      const icon = getFileIcon(node.path);
      const isActive = node.path === selectedFile;
      return (
        <button
          key={node.path}
          type="button"
          onClick={() => setSelectedFile(node.path)}
          className={cn(
            "flex h-9 w-full items-center gap-2 rounded-md pr-2 text-sm transition-colors",
            "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            isActive && "bg-muted text-foreground"
          )}
          style={{ paddingLeft: 8 + depth * 12 }}
        >
          {icon ? (
            <icon.component color={icon.color} className="size-4" />
          ) : (
            <FileIcon className="size-4 text-muted-foreground" />
          )}
          <span className="truncate">{node.name}</span>
        </button>
      );
    });
  };

  const filename = selectedFile?.split("/").pop() ?? null;

  const body = (() => {
    if (!selectedFile) {
      return (
        <div className="flex h-full items-center justify-center px-4 text-sm text-muted-foreground">
          Select a file to view its contents.
        </div>
      );
    }

    if (filesQuery.isError) {
      return (
        <div className="flex h-full items-center justify-center px-4 text-sm text-destructive">
          Failed to load file list.
        </div>
      );
    }

    if (content.status === "idle" || content.status === "loading") {
      return (
        <div className="flex h-full flex-col gap-4 overflow-auto p-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-full min-h-[240px] w-full" />
        </div>
      );
    }

    if (content.status === "error") {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-sm text-destructive">
          <span>Failed to load file.</span>
          <span className="text-muted-foreground">{content.error}</span>
        </div>
      );
    }

    if (content.status === "ready") {
      switch (content.mode) {
        case "markdown":
          return (
            <div className="h-full overflow-auto px-6 py-4">
              {content.text && <Markdown>{content.text}</Markdown>}
            </div>
          );
        case "text": {
          const ext = getExtension(selectedFile);
          const language = languageMap[ext] ?? "text";
          return (
            <div className="h-full overflow-auto">
              {content.text && (
                <CodeBlockContent
                  code={content.text}
                  language={language}
                  showLineNumbers
                  className="overflow-auto"
                >
                  <CodeBlockCopyButton />
                </CodeBlockContent>
              )}
            </div>
          );
        }
        case "image":
          return (
            <div className="flex h-full items-center justify-center overflow-auto p-4">
              {content.objectUrl && (
                <img
                  src={content.objectUrl}
                  alt={filename ?? content.path}
                  className="max-h-full max-w-full rounded-md border"
                />
              )}
            </div>
          );
        case "video":
          return (
            <div className="flex h-full items-center justify-center overflow-hidden bg-black">
              {content.objectUrl && (
                <video
                  src={content.objectUrl}
                  controls
                  className="h-full max-h-full w-full max-w-full object-contain"
                />
              )}
            </div>
          );
        case "fallback-text":
          return (
            <div className="flex h-full flex-col overflow-hidden">
              <div className="border-b px-4 py-2 text-xs text-muted-foreground">
                Preview not available; displaying raw text output.
                {content.objectUrl && (
                  <a
                    href={content.objectUrl}
                    download={filename ?? content.path}
                    className="ml-2 text-primary underline underline-offset-4"
                  >
                    Download original
                  </a>
                )}
              </div>
              <div className="flex-1 overflow-auto p-4">
                {content.text && (
                  <CodeBlock
                    code={content.text}
                    language="text"
                    showLineNumbers
                    className="overflow-auto"
                  >
                    <CodeBlockCopyButton />
                  </CodeBlock>
                )}
              </div>
            </div>
          );
      }
    }

    return null;
  })();

  return (
    <div className="flex h-full min-h-0 overflow-hidden bg-background">
      <aside className="flex w-72 min-w-64 flex-col border-r bg-muted/30">
        <div className="px-3 py-2 text-xs font-semibold uppercase text-muted-foreground">
          Files
        </div>
        {filesQuery.isLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <Skeleton className="h-32 w-32" />
          </div>
        ) : filesQuery.isError ? (
          <div className="flex flex-1 items-center justify-center px-4 text-center text-sm text-destructive">
            Failed to load files.
          </div>
        ) : filesQuery.data?.files?.length ? (
          <ScrollArea className="flex-1 min-h-0">
            <div className="flex flex-col gap-1 px-2 pb-2">
              {renderTree(tree)}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex flex-1 items-center justify-center px-4 text-center text-sm text-muted-foreground">
            No files found in this branch.
          </div>
        )}
      </aside>
      <section className="flex min-w-0 flex-1 flex-col bg-background">
        <div className="border-b px-4 py-2 text-sm font-medium">
          {filename ?? "Select a file"}
        </div>
        <div className="flex-1 overflow-hidden">
          {body ?? (
            <div className="flex h-full items-center justify-center px-4 text-sm text-muted-foreground">
              Unable to display this file.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
