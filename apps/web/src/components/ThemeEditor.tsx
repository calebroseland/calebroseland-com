import { Dialog } from '@base-ui/react/dialog';
import { Fieldset } from '@base-ui/react/fieldset';
import { Popover } from '@base-ui/react/popover';
import {
  Button,
  button,
  Icon,
  iconButton,
  input,
  RadioGroup,
  Select,
  Slider,
  Switch,
  TextField,
  usePopupMotion,
} from '@crc/ui';
import { type ReactNode, useEffect, useId, useState } from 'react';
import { HexColorInput, HexColorPicker } from 'react-colorful';
import { siteFonts } from '../content/theme.ts';
import { contrastRatio, parseColor } from '../theme/contrast.ts';
import {
  type CustomTheme,
  customTheme,
  defaultTheme,
  FONTS,
  NAME_FONTS,
  RANGES,
  READING_FONTS,
  TEXT_FONTS,
} from '../theme/custom.ts';
import { themeController } from '../theme/store.ts';
import styles from './ThemeEditor.module.css';

const pct = (v: number) => `${Number((v * 100).toFixed(1))}%`;
/** react-colorful's input can emit #abc; the theme stores #aabbcc. */
const sixDigit = (hex: string) =>
  /^#[0-9a-f]{3}$/i.test(hex)
    ? `#${[...hex.slice(1)].map((ch) => ch + ch).join('')}`.toLowerCase()
    : hex.toLowerCase();

const Section = ({ title, children }: { title: string; children: ReactNode }) => {
  return (
    <Fieldset.Root className={styles.section}>
      <Fieldset.Legend className={styles.sectionTitle}>{title}</Fieldset.Legend>
      {children}
    </Fieldset.Root>
  );
};

const BASES = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
] as const;

/** Ties a field's visible label to the control it names. */
const useLabelId = () => {
  return useId();
};

const ColorField = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (hex: string) => void;
}) => {
  const labelId = useLabelId();
  const motion = usePopupMotion('dropdown');
  return (
    <div className={styles.colorField}>
      <span id={labelId} className={styles.label}>
        {label}
      </span>
      <Popover.Root onOpenChange={motion.onOpenChange}>
        <Popover.Trigger className={styles.swatchButton} aria-label={`Pick ${label.toLowerCase()}`}>
          <span className={styles.swatch} style={{ background: value }} />
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner
            className={styles.floating}
            side="bottom"
            align="start"
            sideOffset={8}
          >
            <Popover.Popup ref={motion.ref} className={styles.pickerPopup} aria-label={label}>
              <HexColorPicker color={value} onChange={(hex) => onChange(sixDigit(hex))} />
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
      <HexColorInput
        className={`${input({ size: 'sm' })} ${styles.hexInput}`}
        color={value}
        onChange={(hex) => onChange(sixDigit(hex))}
        prefixed
        aria-labelledby={labelId}
      />
    </div>
  );
};

const PAIRS: ReadonlyArray<[label: string, fg: string, bg: string, min: number]> = [
  ['Body text', '--color-text', '--color-bg', 4.5],
  ['Muted text', '--color-text-muted', '--color-surface', 4.5],
  ['Links', '--color-link', '--color-bg', 4.5],
  ['Button text', '--color-text-on-accent', '--color-accent', 4.5],
  ['Accent on page', '--color-accent', '--color-bg', 3],
];

type ContrastRow = { label: string; ratio: number; min: number };

/* Reads the semantic colours the page is actually showing (the preview is already applied), so the
   numbers include every derivation step. Renders nothing where colours cannot be computed. */
const useContrast = (theme: CustomTheme): ContrastRow[] => {
  const [rows, setRows] = useState<ContrastRow[]>([]);
  useEffect(() => {
    void theme;
    const probe = document.createElement('span');
    probe.hidden = true;
    document.body.append(probe);
    const read = (token: string) => {
      probe.style.color = `var(${token})`;
      return parseColor(getComputedStyle(probe).color);
    };
    const next = PAIRS.flatMap(([label, fg, bg, min]) => {
      const f = read(fg);
      const b = read(bg);
      return f && b ? [{ label, ratio: contrastRatio(f, b), min }] : [];
    });
    probe.remove();
    setRows(next);
  }, [theme]);
  return rows;
};

const ContrastReadout = ({ rows }: { rows: ContrastRow[] }) => {
  if (rows.length === 0) {
    return null;
  }
  const failing = rows.filter((r) => r.ratio < r.min).length;
  return (
    <section className={styles.contrast} aria-label="Contrast">
      <p role="status" className={failing ? styles.warn : styles.ok}>
        <Icon name={failing ? 'lucide:triangle-alert' : 'lucide:check'} size="sm" />
        {failing === 0
          ? 'Every checked pair meets WCAG AA.'
          : `${failing} ${failing === 1 ? 'pair is' : 'pairs are'} below WCAG AA.`}
      </p>
      <ul className={styles.contrastList} role="list">
        {rows.map((r) => (
          <li key={r.label} data-failing={r.ratio < r.min || undefined}>
            <span>{r.label}</span>
            <span className={styles.ratio}>
              {r.ratio.toFixed(1)}:1
              <span className="visually-hidden">
                {r.ratio < r.min ? `, below ${r.min}:1` : `, meets ${r.min}:1`}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
};

const textFonts = TEXT_FONTS.map((id) => ({
  value: id,
  label: FONTS[id].label,
  font: FONTS[id].stack,
}));

/** The theme being edited, previewed live on the page and put back when the editor closes. */
const useThemeDraft = (initial: CustomTheme) => {
  const [theme, setTheme] = useState(initial);
  useEffect(() => {
    themeController.preview(theme);
  }, [theme]);
  useEffect(() => () => themeController.preview(null), []);
  return {
    theme,
    set: <K extends keyof CustomTheme>(key: K, value: CustomTheme[K]) =>
      setTheme((t) => ({ ...t, [key]: value })),
  };
};

/** Delete takes a second press, so one click cannot throw a theme away. */
const useDeleteConfirm = () => {
  const [confirmDelete, setConfirmDelete] = useState(false);
  return { confirmDelete, setConfirmDelete };
};

/* The page behind the sheet is the preview: every change applies to it at once, Save keeps it, and
   Cancel, Escape or the close button put back what was showing. Clicks on the page do not dismiss the
   sheet, so a stray click cannot throw away an edit. */
export const ThemeEditor = ({
  initial,
  isNew,
  onClose,
}: {
  initial: CustomTheme;
  isNew: boolean;
  onClose: () => void;
}) => {
  const { theme, set } = useThemeDraft(initial);
  const { confirmDelete, setConfirmDelete } = useDeleteConfirm();
  const defaults = defaultTheme(theme.base, theme.id, theme.name, siteFonts);
  const contrast = useContrast(theme);

  const nameFonts = NAME_FONTS.map((id) =>
    id === 'text'
      ? {
          value: id,
          label: `Same as text (${FONTS[theme.fontText].label})`,
          font: FONTS[theme.fontText].stack,
        }
      : { value: id, label: FONTS[id].label, font: FONTS[id].stack },
  );

  const readingFonts = READING_FONTS.map((id) =>
    id === 'text'
      ? {
          value: id,
          label: `Same as text (${FONTS[theme.fontText].label})`,
          font: FONTS[theme.fontText].stack,
        }
      : { value: id, label: FONTS[id].label, font: FONTS[id].stack },
  );

  const save = () => {
    themeController.saveCustom(
      customTheme.parse({ ...theme, name: theme.name.trim() || initial.name }),
    );
    onClose();
  };

  return (
    <Dialog.Root
      open
      disablePointerDismissal
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Popup className={styles.sheet}>
          <header className={styles.header}>
            <div>
              <Dialog.Title className={styles.title}>
                {isNew ? 'New theme' : 'Edit theme'}
              </Dialog.Title>
              <Dialog.Description className={styles.description}>
                Changes preview on the page as you make them.
              </Dialog.Description>
            </div>
            <Dialog.Close className={iconButton({ shape: 'round' })} aria-label="Cancel and close">
              <Icon name="lucide:x" size="md" />
            </Dialog.Close>
          </header>

          <div className={styles.body}>
            <TextField
              label="Name"
              size="sm"
              value={theme.name}
              maxLength={40}
              onValueChange={(v) => set('name', v)}
            />

            <RadioGroup
              legend="Built on"
              value={theme.base}
              options={BASES}
              onValueChange={(v) => set('base', v)}
            />

            <Section title="Color">
              <ColorField label="Accent" value={theme.accent} onChange={(v) => set('accent', v)} />
              <p className={styles.hint}>
                Sets the accent's hue and vividness. Each shade keeps the lightness that holds its
                contrast.
              </p>
              <Slider
                label="Neutral hue"
                value={theme.neutralHue}
                min={0}
                max={359}
                step={1}
                initial={defaults.neutralHue}
                format={(v) => `${v}°`}
                onChange={(v) => set('neutralHue', v)}
                trackStyle={{
                  background:
                    'linear-gradient(to right in oklch longer hue, oklch(0.7 0.12 0), oklch(0.7 0.12 0))',
                }}
              />
              <Slider
                label="Neutral tint"
                value={theme.neutralTint}
                {...RANGES.neutralTint}
                initial={defaults.neutralTint}
                format={(v) => pct(v / RANGES.neutralTint.max)}
                onChange={(v) => set('neutralTint', v)}
              />
              <Switch
                label="Landing backdrop matches accent"
                checked={theme.backdrop === null}
                onCheckedChange={(match) => set('backdrop', match ? null : theme.accent)}
              />
              {theme.backdrop !== null && (
                <ColorField
                  label="Backdrop"
                  value={theme.backdrop}
                  onChange={(v) => set('backdrop', v)}
                />
              )}
            </Section>

            <Section title="Type">
              <Select
                label="Text font"
                value={theme.fontText}
                options={textFonts.map((o) => ({ ...o, style: { fontFamily: o.font } }))}
                onValueChange={(v) => set('fontText', v)}
              />
              <Select
                label="Reading font"
                value={theme.fontReading}
                options={readingFonts.map((o) => ({ ...o, style: { fontFamily: o.font } }))}
                onValueChange={(v) => set('fontReading', v)}
              />
              <Select
                label="Name font"
                value={theme.fontName}
                options={nameFonts.map((o) => ({ ...o, style: { fontFamily: o.font } }))}
                onValueChange={(v) => set('fontName', v)}
              />
              <Slider
                label="Text size"
                value={theme.textScale}
                {...RANGES.textScale}
                initial={defaults.textScale}
                format={pct}
                onChange={(v) => set('textScale', v)}
              />
              <Slider
                label="Line height"
                value={theme.leading}
                {...RANGES.leading}
                initial={defaults.leading}
                format={(v) => v.toFixed(2)}
                onChange={(v) => set('leading', v)}
              />
            </Section>

            <Section title="Layout">
              <Slider
                label="Spacing"
                value={theme.spaceScale}
                {...RANGES.spaceScale}
                initial={defaults.spaceScale}
                format={pct}
                onChange={(v) => set('spaceScale', v)}
              />
              <Slider
                label="Corner radius"
                value={theme.radiusScale}
                {...RANGES.radiusScale}
                initial={defaults.radiusScale}
                format={pct}
                onChange={(v) => set('radiusScale', v)}
              />
              <Slider
                label="Content width"
                value={theme.measure}
                {...RANGES.measure}
                initial={defaults.measure}
                format={(v) => `${v} characters`}
                onChange={(v) => set('measure', v)}
              />
              <Slider
                label="Shadow depth"
                value={theme.shadowScale}
                {...RANGES.shadowScale}
                initial={defaults.shadowScale}
                format={pct}
                onChange={(v) => set('shadowScale', v)}
              />
            </Section>

            <ContrastReadout rows={contrast} />
          </div>

          <footer className={styles.footer}>
            {!isNew && (
              <Button
                variant="ghost"
                tone="danger"
                size="sm"
                onClick={() => {
                  if (!confirmDelete) {
                    return setConfirmDelete(true);
                  }
                  themeController.deleteCustom(initial.id);
                  onClose();
                }}
              >
                <Icon name="lucide:trash-2" size="sm" />
                {confirmDelete ? 'Delete for good' : 'Delete'}
              </Button>
            )}
            <span className={styles.spacer} />
            <Dialog.Close className={button({ size: 'sm' })}>Cancel</Dialog.Close>
            <Button variant="primary" size="sm" onClick={save}>
              Save theme
            </Button>
          </footer>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
