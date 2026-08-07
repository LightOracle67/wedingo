import { describe, it, expect } from "vitest";
import { escHtml } from "../utils";

describe("escHtml", () => {
  it("escapes & to &amp;", () => {
    expect(escHtml("a & b")).toBe("a &amp; b");
  });

  it("escapes < to &lt;", () => {
    expect(escHtml("<tag>")).toBe("&lt;tag&gt;");
  });

  it("escapes > to &gt;", () => {
    expect(escHtml("a > b")).toBe("a &gt; b");
  });

  it("escapes double quotes to &quot;", () => {
    expect(escHtml('say "hello"')).toBe("say &quot;hello&quot;");
  });

  it("escapes single quotes to &#039;", () => {
    expect(escHtml("it's")).toBe("it&#039;s");
  });

  it("handles all special characters together", () => {
    expect(escHtml('<div class="test">Tom & Jerry\'s</div>')).toBe(
      "&lt;div class=&quot;test&quot;&gt;Tom &amp; Jerry&#039;s&lt;/div&gt;",
    );
  });

  it("returns empty string for null input", () => {
    expect(escHtml(null)).toBe("");
  });

  it("returns empty string for undefined input", () => {
    expect(escHtml(undefined)).toBe("");
  });

  it("returns empty string for empty string", () => {
    expect(escHtml("")).toBe("");
  });

  it("returns original string when no special chars present", () => {
    expect(escHtml("hello world")).toBe("hello world");
  });

  it("handles numeric input", () => {
    expect(escHtml(123)).toBe("123");
  });

  it("handles boolean input", () => {
    expect(escHtml(true)).toBe("true");
    expect(escHtml(false)).toBe("");
  });
});
