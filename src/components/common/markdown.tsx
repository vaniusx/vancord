import DOMPurify from "dompurify";
import { marked } from "marked";
import { useMemo } from "react";

import { openExternal } from "@/lib/open-external";
import { cn } from "@/lib/utils";

marked.setOptions({ gfm: true, breaks: true });

/**
 * Mentions are highlighted while the message is rendered rather than stored,
 * so a username change keeps old messages readable. The @everyone token gets a
 * stronger treatment because it addresses the whole channel.
 */
marked.use({
  extensions: [
    {
      name: "mention",
      level: "inline",
      start(src) {
        return src.indexOf("@");
      },
      tokenizer(src) {
        const match = /^@([a-zA-Z0-9_.]{2,32})/.exec(src);
        if (!match) return undefined;
        return {
          type: "mention",
          raw: match[0],
          username: match[1],
          everyone: match[1].toLowerCase() === "everyone",
        };
      },
      renderer(token) {
        const name = (token as unknown as { username: string }).username;
        const everyone = (token as unknown as { everyone: boolean }).everyone;
        return `<span class="chat-mention${everyone ? " chat-mention-everyone" : ""}">@${name}</span>`;
      },
    },
  ],
});

function render(content: string) {
  const html = marked.parse(content, { async: false }) as string;
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ["target", "rel", "class"],
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
