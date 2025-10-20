/**
 * Tests for unified document generation and creation
 * 
 * Tests cover:
 * - Markdown to TipTap conversion
 * - Content validation
 * - Idempotency behavior
 * - Full generation + creation flow
 */

import { describe, it, expect } from "vitest";
import {
  markdownToTipTap,
  extractTextFromTipTap,
  validateTipTapDocument,
  convertMediaAssetsToTipTap,
  createYouTubeBlock,
  createImageBlock,
  createFileBlock,
  type MediaAsset
} from "../../lib/markdownToTipTap";

describe("Markdown to TipTap Conversion", () => {
  it("should convert simple paragraph", () => {
    const md = "This is a paragraph.";
    const doc = markdownToTipTap(md);
    
    expect(doc.type).toBe("doc");
    expect(doc.content.length).toBeGreaterThan(0);
    expect(doc.content[0].type).toBe("paragraph");
  });

  it("should convert headings", () => {
    const md = "# Heading 1\n## Heading 2\n### Heading 3";
    const doc = markdownToTipTap(md);
    
    const headings = doc.content.filter(n => n.type === "heading");
    expect(headings.length).toBe(3);
    expect(headings[0].attrs?.level).toBe(1);
    expect(headings[1].attrs?.level).toBe(2);
    expect(headings[2].attrs?.level).toBe(3);
  });

  it("should convert code blocks", () => {
    const md = "```typescript\nconst x = 1;\n```";
    const doc = markdownToTipTap(md);
    
    const codeBlocks = doc.content.filter(n => n.type === "codeBlock");
    expect(codeBlocks.length).toBe(1);
    expect(codeBlocks[0].attrs?.language).toBe("typescript");
  });

  it("should convert unordered lists", () => {
    const md = "- Item 1\n- Item 2\n- Item 3";
    const doc = markdownToTipTap(md);
    
    const lists = doc.content.filter(n => n.type === "bulletList");
    expect(lists.length).toBe(1);
    expect(lists[0].content?.length).toBe(3);
  });

  it("should convert ordered lists", () => {
    const md = "1. First\n2. Second\n3. Third";
    const doc = markdownToTipTap(md);
    
    const lists = doc.content.filter(n => n.type === "orderedList");
    expect(lists.length).toBe(1);
    expect(lists[0].content?.length).toBe(3);
  });

  it("should convert blockquotes", () => {
    const md = "> This is a quote";
    const doc = markdownToTipTap(md);
    
    const quotes = doc.content.filter(n => n.type === "blockquote");
    expect(quotes.length).toBe(1);
  });

  it("should handle inline formatting", () => {
    const md = "This is **bold** and *italic* and `code`.";
    const doc = markdownToTipTap(md);
    
    expect(doc.content.length).toBeGreaterThan(0);
    const para = doc.content[0];
    expect(para.type).toBe("paragraph");
    // Content should have text nodes with marks
    expect(para.content).toBeDefined();
  });

  it("should handle mixed content", () => {
    const md = `# Title
    
This is a paragraph with **bold** text.

- List item 1
- List item 2

\`\`\`js
console.log("code");
\`\`\`

> A quote`;
    
    const doc = markdownToTipTap(md);
    
    expect(doc.type).toBe("doc");
    expect(doc.content.length).toBeGreaterThan(0);
    
    const types = doc.content.map(n => n.type);
    expect(types).toContain("heading");
    expect(types).toContain("paragraph");
    expect(types).toContain("bulletList");
    expect(types).toContain("codeBlock");
    expect(types).toContain("blockquote");
  });

  it("should handle empty input", () => {
    const md = "";
    const doc = markdownToTipTap(md);
    
    expect(doc.type).toBe("doc");
    expect(doc.content.length).toBeGreaterThan(0);
    expect(doc.content[0].type).toBe("paragraph");
  });

  it("should handle whitespace-only input", () => {
    const md = "   \n\n   ";
    const doc = markdownToTipTap(md);
    
    expect(doc.type).toBe("doc");
    expect(doc.content.length).toBeGreaterThan(0);
  });
});

describe("TipTap Document Validation", () => {
  it("should validate correct document", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Hello" }],
        },
      ],
    };
    
    expect(validateTipTapDocument(doc)).toBe(true);
  });

  it("should reject invalid document (missing type)", () => {
    const doc = {
      content: [{ type: "paragraph" }],
    };
    
    expect(validateTipTapDocument(doc)).toBe(false);
  });

  it("should reject invalid document (wrong type)", () => {
    const doc = {
      type: "article",
      content: [],
    };
    
    expect(validateTipTapDocument(doc)).toBe(false);
  });

  it("should reject invalid document (missing content)", () => {
    const doc = {
      type: "doc",
    };
    
    expect(validateTipTapDocument(doc)).toBe(false);
  });
});

describe("Text Extraction from TipTap", () => {
  it("should extract text from simple document", () => {
    const doc = markdownToTipTap("Hello world");
    const text = extractTextFromTipTap(doc);

    expect(text).toContain("Hello");
    expect(text).toContain("world");
  });

  it("should extract text from complex document", () => {
    const md = `# Title

Paragraph with **bold** text.

- Item 1
- Item 2`;

    const doc = markdownToTipTap(md);
    const text = extractTextFromTipTap(doc);

    expect(text).toContain("Title");
    expect(text).toContain("Paragraph");
    expect(text).toContain("Item 1");
    expect(text).toContain("Item 2");
  });

  it("should handle empty document", () => {
    const doc = markdownToTipTap("");
    const text = extractTextFromTipTap(doc);

    expect(typeof text).toBe("string");
  });
});

describe("Media Asset Conversion to TipTap", () => {
  it("should create YouTube video block", () => {
    const asset: MediaAsset = {
      type: "youtube",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      title: "Test Video",
    };

    const block = createYouTubeBlock(asset);

    expect(block.type).toBe("video");
    expect(block.attrs?.url).toBe(asset.url);
    expect(block.attrs?.caption).toBe(asset.title);
  });

  it("should create image block", () => {
    const asset: MediaAsset = {
      type: "image",
      url: "https://example.com/image.jpg",
      title: "Test Image",
    };

    const block = createImageBlock(asset);

    expect(block.type).toBe("image");
    expect(block.attrs?.url).toBe(asset.url);
    expect(block.attrs?.caption).toBe(asset.title);
  });

  it("should create file block", () => {
    const asset: MediaAsset = {
      type: "sec-document",
      url: "https://www.sec.gov/Archives/edgar/data/...",
      title: "10-K Filing",
    };

    const block = createFileBlock(asset);

    expect(block.type).toBe("file");
    expect(block.attrs?.url).toBe(asset.url);
    expect(block.attrs?.name).toBe(asset.title);
  });

  it("should convert multiple media assets to TipTap nodes", () => {
    const assets: MediaAsset[] = [
      {
        type: "youtube",
        url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        title: "Video 1",
      },
      {
        type: "youtube",
        url: "https://www.youtube.com/watch?v=jNQXAC9IVRw",
        title: "Video 2",
      },
      {
        type: "image",
        url: "https://example.com/image.jpg",
        title: "Image 1",
      },
      {
        type: "sec-document",
        url: "https://www.sec.gov/filing",
        title: "SEC Filing",
      },
    ];

    const nodes = convertMediaAssetsToTipTap(assets);

    // Should have section headers + media blocks
    expect(nodes.length).toBeGreaterThan(assets.length);

    // Should have video section header
    const videoHeaders = nodes.filter(n =>
      n.type === "heading" &&
      n.content?.[0]?.type === "text" &&
      (n.content[0] as any).text?.includes("Videos")
    );
    expect(videoHeaders.length).toBeGreaterThan(0);

    // Should have video blocks
    const videoBlocks = nodes.filter(n => n.type === "video");
    expect(videoBlocks.length).toBe(2);

    // Should have image blocks
    const imageBlocks = nodes.filter(n => n.type === "image");
    expect(imageBlocks.length).toBe(1);

    // Should have file blocks
    const fileBlocks = nodes.filter(n => n.type === "file");
    expect(fileBlocks.length).toBe(1);
  });

  it("should handle empty media assets array", () => {
    const nodes = convertMediaAssetsToTipTap([]);

    expect(Array.isArray(nodes)).toBe(true);
    expect(nodes.length).toBe(0);
  });

  it("should group media by type with section headers", () => {
    const assets: MediaAsset[] = [
      { type: "youtube", url: "https://youtube.com/watch?v=dQw4w9WgXcQ", title: "Video 1" },
      { type: "youtube", url: "https://youtube.com/watch?v=jNQXAC9IVRw", title: "Video 2" },
      { type: "image", url: "https://example.com/1.jpg", title: "Image 1" },
    ];

    const nodes = convertMediaAssetsToTipTap(assets);

    // Find the video section header
    const videoHeaderIndex = nodes.findIndex(n =>
      n.type === "heading" &&
      n.content?.[0]?.type === "text" &&
      (n.content[0] as any).text?.includes("Videos")
    );

    expect(videoHeaderIndex).toBeGreaterThanOrEqual(0);

    // Videos should come after the header
    const firstVideoIndex = nodes.findIndex(n => n.type === "video");
    expect(firstVideoIndex).toBeGreaterThan(videoHeaderIndex);
  });
});

