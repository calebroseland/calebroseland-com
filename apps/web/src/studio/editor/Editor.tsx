import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { Markdown } from "@tiptap/markdown";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useRef } from "react";
import styles from "./Editor.module.css";
import { Toolbar } from "./Toolbar.tsx";

/* TipTap owns the document and its own drag handles. Storage is markdown, produced by @tiptap/markdown;
   the allowed node set is what GitHub renders (spec §5.6). Images are inserted by the caller after resize. */

export type EditorApi = {
  insertImage(src: string, alt: string): void;
  /** Alt text is edited in the panel; the document is where it has to end up to reach the markdown. */
  setImageAlt(src: string, alt: string): void;
  focus(): void;
};

export function Editor({
  initialMarkdown,
  onChange,
  onImageFiles,
  apiRef,
}: {
  initialMarkdown: string;
  onChange: (markdown: string) => void;
  onImageFiles: (files: File[]) => void;
  apiRef?: React.RefObject<EditorApi | null>;
}) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onImageFilesRef = useRef(onImageFiles);
  onImageFilesRef.current = onImageFiles;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: { HTMLAttributes: { class: "code" } },
        link: { openOnClick: false, autolink: true, defaultProtocol: "https" },
      }),
      Markdown,
      Image.configure({ inline: false, allowBase64: true }),
      Placeholder.configure({ placeholder: "Write. Type / for commands, paste or drop an image." }),
    ],
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

  return (
    <div className={styles.frame}>
      {editor && (
        <Toolbar editor={editor} onPickImage={(files) => onImageFilesRef.current(files)} />
      )}
      <EditorContent editor={editor} />
    </div>
  );
}
