import { marked } from "marked";
import { memo, useMemo } from "react";
import ReactMarkdown from "react-markdown";

const parseMarkdownIntoBlocks = (markdown: string) =>
  marked.lexer(markdown).map((t) => t.raw);

const MemoizedMarkdownBlock = memo(
  ({ content }: { content: string }) => (
    <ReactMarkdown
      components={{
        a: ({ children, href }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary"
          >
            {children}
          </a>
        ),
        code: ({ children }) => (
          <code className="block w-full overflow-y-auto">{children}</code>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  ),
  (prev, next) => prev.content === next.content
);

MemoizedMarkdownBlock.displayName = "MemoizedMarkdownBlock";

export const Markdown = memo(({ children }: { children: string }) => {
  const blocks = useMemo(() => parseMarkdownIntoBlocks(children), [children]);
  return (
    <>
      <div className="prose-sm prose-ul:list-disc prose-ol:list-decimal break-words">
        {blocks.map((block, index) => (
          <MemoizedMarkdownBlock content={block} key={index} />
        ))}
      </div>
    </>
  );
});
