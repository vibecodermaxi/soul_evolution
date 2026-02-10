import { describe, test, expect } from "@jest/globals";
import { extractTag, extractTagWithAttr, slugify } from "../utils/parser.js";

describe("extractTag", () => {
  test("extracts simple tag content", () => {
    const result = extractTag("<title>Hello World</title>", "title");
    expect(result).toBe("Hello World");
  });

  test("extracts multiline tag content", () => {
    const content = `<breadcrumb>
Line one
Line two
</breadcrumb>`;
    const result = extractTag(content, "breadcrumb");
    expect(result).toBe("Line one\nLine two");
  });

  test("returns null when tag not found", () => {
    const result = extractTag("no tags here", "title");
    expect(result).toBeNull();
  });

  test("trims whitespace", () => {
    const result = extractTag("<title>  spaced  </title>", "title");
    expect(result).toBe("spaced");
  });

  test("extracts soul_update with underscores in tag name", () => {
    const content = `<soul_update>new soul content</soul_update>`;
    const result = extractTag(content, "soul_update");
    expect(result).toBe("new soul content");
  });
});

describe("extractTagWithAttr", () => {
  test("extracts tag value and attribute", () => {
    const content = '<piece format="svg"><svg>...</svg></piece>';
    const result = extractTagWithAttr(content, "piece", "format");
    expect(result).toEqual({ attr: "svg", value: "<svg>...</svg>" });
  });

  test("extracts multiline piece content", () => {
    const content = `<piece format="html">
<html>
<body>Hello</body>
</html>
</piece>`;
    const result = extractTagWithAttr(content, "piece", "format");
    expect(result?.attr).toBe("html");
    expect(result?.value).toContain("<body>Hello</body>");
  });

  test("returns null when tag not found", () => {
    const result = extractTagWithAttr("no tags", "piece", "format");
    expect(result).toBeNull();
  });
});

describe("slugify", () => {
  test("converts to lowercase kebab case", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  test("removes special characters", () => {
    expect(slugify("The Artist's Dream!")).toBe("the-artist-s-dream");
  });

  test("truncates to 50 characters", () => {
    const long = "a".repeat(60);
    expect(slugify(long).length).toBe(50);
  });

  test("strips leading/trailing hyphens", () => {
    expect(slugify("---hello---")).toBe("hello");
  });
});
