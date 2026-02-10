import { describe, test, expect } from "@jest/globals";
import { mdToSimpleHtml, escapeHtml } from "../utils/markdown.js";

describe("escapeHtml", () => {
  test("escapes HTML entities", () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;"
    );
  });

  test("escapes ampersands", () => {
    expect(escapeHtml("a & b")).toBe("a &amp; b");
  });
});

describe("mdToSimpleHtml", () => {
  test("converts h1 to h2", () => {
    expect(mdToSimpleHtml("# Hello")).toContain("<h2>Hello</h2>");
  });

  test("converts h2 to h3", () => {
    expect(mdToSimpleHtml("## Hello")).toContain("<h3>Hello</h3>");
  });

  test("converts h3 to h4", () => {
    expect(mdToSimpleHtml("### Hello")).toContain("<h4>Hello</h4>");
  });

  test("wraps paragraphs", () => {
    const result = mdToSimpleHtml("Hello world");
    expect(result).toContain("<p>");
    expect(result).toContain("Hello world");
    expect(result).toContain("</p>");
  });

  test("handles bold", () => {
    const result = mdToSimpleHtml("This is **bold** text");
    expect(result).toContain("<strong>bold</strong>");
  });

  test("handles italic", () => {
    const result = mdToSimpleHtml("This is *italic* text");
    expect(result).toContain("<em>italic</em>");
  });

  test("handles inline code", () => {
    const result = mdToSimpleHtml("Use `console.log` here");
    expect(result).toContain("<code>console.log</code>");
  });

  test("handles horizontal rules", () => {
    expect(mdToSimpleHtml("---")).toContain("<hr>");
    expect(mdToSimpleHtml("***")).toContain("<hr>");
    expect(mdToSimpleHtml("___")).toContain("<hr>");
  });

  test("handles code blocks", () => {
    const md = "```js\nconst x = 1;\n```";
    const result = mdToSimpleHtml(md);
    expect(result).toContain('<pre><code class="lang-js">');
    expect(result).toContain("const x = 1;");
    expect(result).toContain("</code></pre>");
  });

  test("escapes HTML in code blocks", () => {
    const md = "```\n<script>alert('xss')</script>\n```";
    const result = mdToSimpleHtml(md);
    expect(result).toContain("&lt;script&gt;");
    expect(result).not.toContain("<script>");
  });

  test("separates paragraphs on blank lines", () => {
    const md = "First paragraph\n\nSecond paragraph";
    const result = mdToSimpleHtml(md);
    expect(result).toContain("</p>");
    // Should have two <p> tags
    const pCount = (result.match(/<p>/g) || []).length;
    expect(pCount).toBe(2);
  });
});
