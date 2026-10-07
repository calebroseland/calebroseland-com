import { EditorContent, type Editor as TipTap, useEditor } from "@tiptap/react";
import { type RefObject, useEffect, useRef } from "react";
import { useLatest } from "../../hooks/useLatest.ts";
import styles from "./Editor.module.css";
import { documentExtensions } from "./extensions.ts";
import { Toolbar } from "./Toolbar.tsx";

/* TipTap owns the document and its own drag handles. Storage is markdown, produced by @tiptap/markdown;
   the allowed node set is what GitHub renders (spec §5.6). Images are inserted by the caller after resize. */

export type EditorApi = {
  insertImage(src: string, alt: string): void;
  /** Alt text is edited in the panel; the document is where it has to end up to reach the markdown. */
  setImageAlt(src: string, alt: string): void;
  focus(): void;
};

/** A handle for the screen to reach into the document (insert an image, set its alt text). */
export function useEditorApi() {
  return useRef<EditorApi | null>(null);
}

type EditorProps = {
  initialMarkdown: string;
  onChange: (markdown: string) => void;
  onImageFiles: (files: File[]) => void;
  /** Where to load an image from; the document, and so the markdown, keeps the name as written. */
  previewSrc?: (src: string) => string;
  apiRef?: RefObject<EditorApi | null>;
};

export function Editor(props: EditorProps) {
  const { editor, pickImages } = useMarkdownEditor(props);
  return (
    <div className={styles.frame}>
      {editor && <Toolbar editor={editor} onPickImage={pickImages} />}
      <EditorContent editor={editor} />
    </div>
  );
}

/** The TipTap editor for one document: markdown in and out, pasted or dropped images handed back. */
function useMarkdownEditor({
  initialMarkdown,
  onChange,
  onImageFiles,
  previewSrc,
  apiRef,
}: EditorProps) {
  const onChangeRef = useLatest(onChange);
  const onImageFilesRef = useLatest(onImageFiles);
  const previewSrcRef = useLatest(previewSrc);

  const editor = useEditor({
    extensions: documentExtensions((src) => previewSrcRef.current?.(src) ?? src),
    content: initialMarkdown,
    contentType: "markdown",
    editorProps: {
      attributes: {
        class: `prose ${styles.content}`,
        "aria-label": "Post body",
        role: "textbox",
        "aria-multiline": "true",
      },
      handlePaste: (_view, event) => {
        const files = [...(event.clipboardData?.files ?? [])].filter((f) =>
          f.type.startsWith("image/"),
        );
        if (files.length === 0) return false;
        event.preventDefault();
        onImageFilesRef.current(files);
        return true;
      },
      handleDrop: (_view, event) => {
        const files = [...(event.dataTransfer?.files ?? [])].filter((f) =>
          f.type.startsWith("image/"),
        );
        if (files.length === 0) return false;
        event.preventDefault();
        onImageFilesRef.current(files);
        return true;
      },
    },
    onUpdate: ({ editor }) => onChangeRef.current(editor.getMarkdown()),
  });
  useApiBinding(editor, apiRef);
  return { editor, pickImages: (files: File[]) => onImageFilesRef.current(files) };
}

/** Exposes the editor's commands through `apiRef` for as long as the editor exists. */
function useApiBinding(editor: TipTap | null, apiRef: RefObject<EditorApi | null> | undefined) {
  useEffect(() => {
    if (!apiRef || !editor) return;
    apiRef.current = {
      insertImage: (src, alt) => editor.chain().focus().setImage({ src, alt }).run(),
      setImageAlt: (src, alt) => {
        const { tr } = editor.state;
        let changed = false;
        editor.state.doc.descendants((node, pos) => {
          if (node.type.name === "image" && node.attrs.src === src) {
            tr.setNodeMarkup(pos, undefined, { ...node.attrs, alt });
            changed = true;
          }
        });
        if (changed) editor.view.dispatch(tr);
      },
      focus: () => editor.commands.focus(),
    };
    return () => {
      apiRef.current = null;
    };
  }, [editor, apiRef]);
}
