import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { applySocialMeta, clearSocialMeta, resetSocialMeta, SITE_URL } from "../seo";

describe("seo", () => {
  beforeEach(() => {
    // Limpia las meta tags marcadas de tests anteriores.
    clearSocialMeta();
  });

  afterEach(() => {
    clearSocialMeta();
  });

  it("applies title, description, url and locale meta tags", () => {
    applySocialMeta({
      title: "Ana & Luis — Wedingo",
      description: "Os esperamos",
      url: `${SITE_URL}/abc123`,
      locale: "es",
    });
    expect(document.querySelector('meta[property="og:title"]')?.getAttribute("content")).toBe("Ana & Luis — Wedingo");
    expect(document.querySelector('meta[property="og:description"]')?.getAttribute("content")).toBe("Os esperamos");
    expect(document.querySelector('meta[property="og:url"]')?.getAttribute("content")).toBe(`${SITE_URL}/abc123`);
    expect(document.querySelector('meta[property="og:locale"]')?.getAttribute("content")).toBe("es");
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe(`${SITE_URL}/abc123`);
  });

  it("uses summary_large_image with an absolute http image", () => {
    applySocialMeta({
      title: "T",
      description: "D",
      url: `${SITE_URL}/t`,
      image: "https://example.com/photo.jpg",
    });
    expect(document.querySelector('meta[property="og:image"]')?.getAttribute("content")).toBe("https://example.com/photo.jpg");
    expect(document.querySelector('meta[name="twitter:card"]')?.getAttribute("content")).toBe("summary_large_image");
  });

  it("uses a generic image and summary card for data URIs", () => {
    applySocialMeta({
      title: "T",
      description: "D",
      url: `${SITE_URL}/t`,
      image: "data:image/png;base64,xxxx",
    });
    expect(document.querySelector('meta[property="og:image"]')?.getAttribute("content")).toBe(`${SITE_URL}/og-banner.png`);
    expect(document.querySelector('meta[name="twitter:card"]')?.getAttribute("content")).toBe("summary_large_image");
  });

  it("omits og:locale when no locale is provided", () => {
    applySocialMeta({ title: "T", description: "D", url: `${SITE_URL}/t` });
    expect(document.querySelector('meta[property="og:locale"]')).toBeNull();
  });

  it("clearSocialMeta removes all tagged meta tags", () => {
    applySocialMeta({ title: "T", description: "D", url: `${SITE_URL}/x` });
    expect(document.querySelector('meta[property="og:title"]')).not.toBeNull();
    clearSocialMeta();
    expect(document.querySelector('meta[property="og:title"]')).toBeNull();
    expect(document.querySelector('link[rel="canonical"]')).toBeNull();
  });

  it("resetSocialMeta restores the default landing meta", () => {
    resetSocialMeta();
    expect(document.querySelector('meta[property="og:title"]')?.getAttribute("content")).toContain("Wedingo");
    expect(document.querySelector('meta[property="og:url"]')?.getAttribute("content")).toBe(SITE_URL);
  });
});
