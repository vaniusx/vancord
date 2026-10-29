import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { Markdown } from "@/components/common/markdown";

function html(content: string) {
  return renderToStaticMarkup(<Markdown content={content} />);
}

describe("Markdown", () => {
  it("highlights a username mention", () => {
    const out = html("selam @enes nasılsın");
    expect(out).toContain('class="chat-mention"');
    expect(out).toContain("@enes");
  });

  it("marks @everyone differently", () => {
    const out = html("@everyone toplanın");
    expect(out).toContain("chat-mention-everyone");
  });

  it("does not turn an email into a mention highlight", () => {
    const out = html("mail: enes@example.com");
    expect(out).not.toContain("chat-mention-everyone");
  });

  it("strips script tags", () => {
    const out = html("<script>alert(1)</script>safe");
    expect(out).not.toContain("<script");
    expect(out).toContain("safe");
  });

  it("keeps code blocks fenced", () => {
    const out = html("```js\nconst a = 1;\n```");
    expect(out).toContain("language-js");
    expect(out).toContain("const a = 1;");
  });
});
