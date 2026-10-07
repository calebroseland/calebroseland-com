import { Editor } from "@tiptap/react";
import { afterEach, describe, expect, it } from "vitest";
import { documentExtensions } from "./extensions.ts";

let editor: Editor | undefined;
afterEach(() => editor?.destroy());

const load = (markdown: string): Editor => {
  editor = new Editor({
    extensions: documentExtensions((src) => src),
    content: markdown,
    contentType: "markdown",
  });
  return editor;
};

const topLevel = (e: Editor): string[] =>
  (e.state.doc.toJSON().content as Array<{ type: string }>).map((node) => node.type);

describe("images in the editor's markdown", () => {
  it("keeps images on adjacent lines together as a gallery, in a valid document", () => {
    const e = load("Intro.\n\n![A](a.webp)\n![B](b.webp)\n![C](c.webp)\n\nOutro.");
    expect(() => e.state.doc.check()).not.toThrow();
    expect(topLevel(e)).toEqual(["paragraph", "gallery", "paragraph"]);
    expect(e.getMarkdown()).toBe("Intro.\n\n![A](a.webp)\n![B](b.webp)\n![C](c.webp)\n\nOutro.");
  });

  it("survives typing next to a gallery, and saves it unchanged", () => {
    const e = load("![A](a.webp)\n![B](b.webp)\n\nOutro.");
    expect(() => e.commands.insertContentAt(e.state.doc.content.size - 1, " More.")).not.toThrow();
    expect(() => e.state.doc.check()).not.toThrow();
    expect(e.getMarkdown()).toBe("![A](a.webp)\n![B](b.webp)\n\nOutro. More.");
  });

  it("keeps a gallery whose lines end in a hard break", () => {
    for (const md of ["![A](a.webp)  \n![B](b.webp)", "![A](a.webp)\\\n![B](b.webp)"]) {
      const e = load(md);
      expect(() => e.state.doc.check()).not.toThrow();
      expect(topLevel(e)).toEqual(["gallery"]);
      expect(e.getMarkdown()).toBe("![A](a.webp)\n![B](b.webp)");
    }
  });

  it("leaves blank-line-separated images as separate images", () => {
    const e = load("![A](a.webp)\n\n![B](b.webp)");
    expect(() => e.state.doc.check()).not.toThrow();
    expect(topLevel(e)).toEqual(["image", "image"]);
    expect(e.getMarkdown()).toBe("![A](a.webp)\n\n![B](b.webp)");
  });

  it("keeps a lone image a single image", () => {
    const e = load("![A](a.webp)");
    expect(topLevel(e)).toEqual(["image"]);
    expect(e.getMarkdown()).toBe("![A](a.webp)");
  });
});
