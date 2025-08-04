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
      }}
    >
      {content}
    </ReactMarkdown>
  ),
  (prev, next) => prev.content === next.content
);

MemoizedMarkdownBlock.displayName = "MemoizedMarkdownBlock";

export const Markdown = memo(
  ({ content, id }: { content: string; id: string }) => {
    const blocks = useMemo(() => parseMarkdownIntoBlocks(content), [content]);
    return (
      <>
        <div className="prose-sm prose-ul:list-disc prose-ol:list-decimal break-words">
          {blocks.map((block, index) => (
            <MemoizedMarkdownBlock
              content={block}
              key={`${id}-block_${index}`}
            />
          ))}
        </div>
      </>
    );
  }
);
