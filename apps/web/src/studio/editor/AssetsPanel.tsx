import { Stack } from "@crc/ui";
import type { Buffer, BufferController } from "../drafts/buffer.ts";
import styles from "../studio.module.css";

/* New images awaiting save need alt text; existing ones are listed for reference. */
export function AssetsPanel({
  buffer,
  controller,
}: {
  buffer: Buffer;
  controller: BufferController;
}) {
  return (
    <Stack gap="4" className={styles.panel} aria-label="Images">
      {buffer.assets.length === 0 && buffer.existingAssets.length === 0 && (
        <p className={styles.muted}>No images yet. Paste or drop one into the editor.</p>
      )}
      {buffer.assets.map((a) => (
        <div key={a.name} className={styles.asset}>
          <img src={a.dataUrl} alt={a.alt || ""} width={64} height={64} className={styles.thumb} />
          <div className={styles.field}>
            <label htmlFor={`alt-${a.name}`}>Alt text for {a.name}</label>
            <input
              id={`alt-${a.name}`}
              className={styles.input}
              value={a.alt}
              onChange={(e) => controller.setAlt(a.name, e.target.value)}
              required
              aria-invalid={!a.alt.trim()}
            />
          </div>
          <button
            type="button"
            className={styles.secondary}
            onClick={() => controller.removeAsset(a.name)}
          >
            Remove
          </button>
        </div>
      ))}
      {buffer.existingAssets.length > 0 && (
        <div>
          <p className={styles.muted}>On the branch</p>
          <ul>
            {buffer.existingAssets.map((n) => (
              <li key={n}>
                <code>{n}</code>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Stack>
  );
}
