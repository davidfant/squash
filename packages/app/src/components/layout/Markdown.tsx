import ReactMarkdown from "react-markdown";

export const Markdown = ({ children }: { children: string }) => (
  <div className="prose-sm prose-ul:list-disc prose-ol:list-decimal break-words">
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
      {children}
    </ReactMarkdown>
  </div>
);
