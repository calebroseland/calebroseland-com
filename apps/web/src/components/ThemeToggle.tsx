import { Icon } from "@crc/ui";
import { mdiBrightnessAuto, mdiMoonWaningCrescent, mdiWhiteBalanceSunny } from "@crc/ui/icons";
import { useStore } from "@tanstack/react-store";
import { type ThemePreference, themeController } from "../theme/store.ts";
import styles from "./ThemeToggle.module.css";

const labels: Record<ThemePreference, string> = { auto: "Auto", light: "Light", dark: "Dark" };
const icons: Record<ThemePreference, string> = {
  auto: mdiBrightnessAuto,
  light: mdiWhiteBalanceSunny,
  dark: mdiMoonWaningCrescent,
};

export function ThemeToggle() {
  const preference = useStore(themeController.store, (s) => s.preference);
  return (
    <button
      type="button"
      className={styles.button}
      aria-label={`Theme: ${labels[preference]}. Switch theme.`}
      onClick={() => themeController.cycle()}
    >
      <Icon path={icons[preference]} size="md" />
      <span className="visually-hidden" aria-live="polite">
        {`Theme: ${labels[preference]}`}
      </span>
    </button>
  );
}
