import { Icon } from '@crc/ui';
import type { Editor } from '@tiptap/react';
import { useEditorState } from '@tiptap/react';
import { type KeyboardEvent, useRef } from 'react';
import styles from './Editor.module.css';

/* APG toolbar: one tab stop, arrow keys move between buttons, aria-pressed reflects marks. */

type Cmd = {
  id: string;
  label: string;
  icon: string;
  shortcut?: string;
  active?: (e: Editor) => boolean;
  run: (e: Editor) => void;
};

const commands: Cmd[] = [
  {
    id: 'bold',
    label: 'Bold',
    icon: 'lucide:bold',
    shortcut: '⌘B',
    active: (e) => e.isActive('bold'),
    run: (e) => e.chain().focus().toggleBold().run(),
  },
  {
    id: 'italic',
    label: 'Italic',
    icon: 'lucide:italic',
    shortcut: '⌘I',
    active: (e) => e.isActive('italic'),
    run: (e) => e.chain().focus().toggleItalic().run(),
  },
  {
    id: 'strike',
    label: 'Strikethrough',
    icon: 'lucide:strikethrough',
    active: (e) => e.isActive('strike'),
    run: (e) => e.chain().focus().toggleStrike().run(),
  },
  {
    id: 'code',
    label: 'Inline code',
    icon: 'lucide:code',
    active: (e) => e.isActive('code'),
    run: (e) => e.chain().focus().toggleCode().run(),
  },
  {
    id: 'h1',
    label: 'Heading 1',
    icon: 'lucide:heading-1',
    active: (e) => e.isActive('heading', { level: 1 }),
    run: (e) => e.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    id: 'h2',
    label: 'Heading 2',
    icon: 'lucide:heading-2',
    active: (e) => e.isActive('heading', { level: 2 }),
    run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    id: 'h3',
    label: 'Heading 3',
    icon: 'lucide:heading-3',
    active: (e) => e.isActive('heading', { level: 3 }),
    run: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    id: 'ul',
    label: 'Bullet list',
    icon: 'lucide:list',
    active: (e) => e.isActive('bulletList'),
    run: (e) => e.chain().focus().toggleBulletList().run(),
  },
  {
    id: 'ol',
    label: 'Numbered list',
    icon: 'lucide:list-ordered',
    active: (e) => e.isActive('orderedList'),
    run: (e) => e.chain().focus().toggleOrderedList().run(),
  },
  {
    id: 'quote',
    label: 'Quote',
    icon: 'lucide:quote',
    active: (e) => e.isActive('blockquote'),
    run: (e) => e.chain().focus().toggleBlockquote().run(),
  },
  {
    id: 'codeblock',
    label: 'Code block',
    icon: 'lucide:braces',
    active: (e) => e.isActive('codeBlock'),
    run: (e) => e.chain().focus().toggleCodeBlock().run(),
  },
  {
    id: 'hr',
    label: 'Divider',
    icon: 'lucide:minus',
    run: (e) => e.chain().focus().setHorizontalRule().run(),
  },
  {
    id: 'link',
    label: 'Link',
    icon: 'lucide:link',
    shortcut: '⌘K',
    active: (e) => e.isActive('link'),
    run: (e) => {
      const previous = e.getAttributes('link').href as string | undefined;
      const url = window.prompt('Link URL', previous ?? 'https://');
      if (url === null) {
        return;
      }
      if (url === '') {
        e.chain().focus().extendMarkRange('link').unsetLink().run();
      } else {
        e.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
      }
    },
  },
];

export function Toolbar({
  editor,
  onPickImage,
}: {
  editor: Editor;
  onPickImage: (files: File[]) => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const active = useEditorState({
    editor,
    selector: ({ editor }) =>
      Object.fromEntries(commands.map((c) => [c.id, c.active?.(editor) ?? false])),
  });
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' && e.key !== 'Home' && e.key !== 'End') {
      return;
    }
    const buttons = [...e.currentTarget.querySelectorAll<HTMLButtonElement>('button')];
    const i = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (i < 0) {
      return;
    }
    e.preventDefault();
    const next =
      e.key === 'Home'
        ? 0
        : e.key === 'End'
          ? buttons.length - 1
          : (i + (e.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
    buttons[next]?.focus();
  };
  return (
    <div className={styles.toolbar} role="toolbar" aria-label="Formatting" onKeyDown={onKeyDown}>
      {commands.map((c, i) => (
        <button
          key={c.id}
          type="button"
          className={styles.tool}
          aria-label={c.shortcut ? `${c.label} (${c.shortcut})` : c.label}
          aria-pressed={c.active ? active[c.id] : undefined}
          tabIndex={i === 0 ? 0 : -1}
          onClick={() => c.run(editor)}
        >
          <Icon name={c.icon} size="sm" />
        </button>
      ))}
      <button
        type="button"
        className={styles.tool}
        aria-label="Insert image"
        tabIndex={-1}
        onClick={() => fileInput.current?.click()}
      >
        <Icon name="lucide:image-plus" size="sm" />
      </button>
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          const files = [...(e.target.files ?? [])];
          e.target.value = '';
          if (files.length > 0) {
            onPickImage(files);
          }
        }}
      />
    </div>
  );
}
