import DOMPurify from "dompurify";
import { marked } from "marked";
import { useMemo } from "react";

import { openExternal } from "@/lib/open-external";
import { cn } from "@/lib/utils";

marked.setOptions({ gfm: true, breaks: true });

function render(content: string) {
  const html = marked.parse(content, { async: false }) as string;
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ["target", "rel"],
    FORBID_TAGS: ["style", "iframe", "form", "input"],
    FORBID_ATTR: ["style", "onerror", "onload"],
  });
}

export function Markdown({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  const html = useMemo(() => render(content), [content]);

  return (
    <div
      className={cn("chat-markdown select-text", className)}
      onClick={(event) => {
        const anchor = (event.target as HTMLElement).closest("a");
        if (!anchor) return;
        const href = anchor.getAttribute("href");
        if (!href) return;
        event.preventDefault();
        void openExternal(href);
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
