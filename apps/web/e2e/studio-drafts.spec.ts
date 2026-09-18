import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "./fixtures.ts";

/* Full local loop against the in-memory fake GitHub: create → write → image → save → reload → conflict. */

async function signInFake(page: import("@playwright/test").Page) {
  await page.goto("/studio/login");
  await page.evaluate(() => localStorage.removeItem("crc:fake-github"));
  await page.getByText("Developer options").click();
  await page.getByRole("button", { name: "Use local fake GitHub" }).click();
  await expect(page).toHaveURL(/\/studio\/?$/);
  // Let the board finish loading before the test navigates again; WebKit cancels in-flight module imports otherwise.
  await expect(page.getByRole("heading", { level: 1, name: "Studio" })).toBeVisible();
  await expect(page.getByText("fake-user")).toBeVisible();
}

// 1x1 PNG
const pngBytes = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

test.describe("studio drafts", () => {
  test("create a draft, write, add an image with alt text, save, and see it on the board", async ({
    page,
  }) => {
    await signInFake(page);
    await expect(page.getByText("No drafts yet.")).toBeVisible();

    await page.getByRole("link", { name: "New post" }).click();
    await page.getByLabel("Title").fill("Hello Studio");
    await expect(page.getByLabel("Slug")).toHaveValue("hello-studio");
    await page.getByRole("button", { name: "Create draft" }).click();
    await expect(page).toHaveURL(/\/studio\/hello-studio/);
    await expect(page.getByRole("heading", { level: 1, name: "Hello Studio" })).toBeVisible();
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();

    const body = page.getByRole("textbox", { name: "Post body" });
    await body.click();
    await page.keyboard.type("First paragraph of the post.");
    await expect(page.getByText("Unsaved changes")).toBeVisible();

    // Toolbar is an APG toolbar: one tab stop, arrows move.
    const bold = page.getByRole("button", { name: /^Bold/ });
    await bold.focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("button", { name: /^Italic/ })).toBeFocused();

    await page
      .getByRole("button", { name: "Insert image" })
      .click({ trial: true })
      .catch(() => {});
    await page
      .locator('input[type="file"]')
      .setInputFiles({ name: "photo.png", mimeType: "image/png", buffer: pngBytes });
    await expect(page.getByRole("tab", { name: /Images \(1\)/ })).toBeVisible();

    // Saving without alt text is blocked and focuses the media panel.
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText("Add alt text for 1 image.");
    await page.getByLabel(/Alt text for photo\.png/).fill("A tiny test image");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "Committed" })).toContainText(
      "Committed to drafts/hello-studio",
    );
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();

    await page.getByRole("link", { name: "← Drafts" }).click();
    await expect(page.getByRole("link", { name: "hello-studio" })).toBeVisible();
    await expect(page.getByText("Draft branches (1)")).toBeVisible();
  });

  test("unsaved edits survive a reload and can be discarded", async ({ page }) => {
    await signInFake(page);
    await page.getByRole("link", { name: "New post" }).click();
    await page.getByLabel("Title").fill("Persist Me");
    await page.getByRole("button", { name: "Create draft" }).click();
    await expect(page).toHaveURL(/\/studio\/persist-me/);
    await page.getByRole("textbox", { name: "Post body" }).click();
    await page.keyboard.type("Not yet saved");
    await expect(page.getByText("Unsaved changes")).toBeVisible();
    await page.waitForFunction(() => localStorage.getItem("crc:buffer:drafts/persist-me") !== null);
    await page.reload();
    await expect(page.getByRole("status").filter({ hasText: "Restored" })).toContainText(
      "Restored unsaved changes from this device.",
    );
    await expect(page.getByRole("textbox", { name: "Post body" })).toContainText("Not yet saved");
    await page.getByRole("button", { name: "Discard local changes" }).click();
    await expect(page.getByRole("textbox", { name: "Post body" })).not.toContainText(
      "Not yet saved",
    );
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  });

  test("a stale head shows the conflict dialog and nothing is overwritten silently", async ({
    page,
  }) => {
    await signInFake(page);
    await page.getByRole("link", { name: "New post" }).click();
    await page.getByLabel("Title").fill("Conflict");
    await page.getByRole("button", { name: "Create draft" }).click();
    await expect(page).toHaveURL(/\/studio\/conflict/);
    await page.getByRole("textbox", { name: "Post body" }).click();
    await page.keyboard.type("mine");
    await page.waitForFunction(() => localStorage.getItem("crc:buffer:drafts/conflict") !== null);
    // Simulate another writer moving the branch before our save.
    await page.evaluate(() => {
      const raw = localStorage.getItem("crc:fake-github");
      if (!raw) throw new Error("fake state missing");
      const state = JSON.parse(raw);
      state.conflictOnce = true;
      localStorage.setItem("crc:fake-github", JSON.stringify(state));
    });
    await page.reload();
    await expect(page.getByRole("status").filter({ hasText: "Restored" })).toContainText(
      "Restored unsaved changes",
    );
    await page.getByRole("button", { name: "Save", exact: true }).click();
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toContainText("This post changed on GitHub");
    await dialog.getByRole("button", { name: "Overwrite" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Committed" })).toContainText(
      "Committed to drafts/conflict",
    );
  });

  test("profile links reorder with the keyboard menu and announce the move", async ({ page }) => {
    await signInFake(page);
    await page.getByRole("link", { name: "Profile links" }).click();
    const list = page.getByRole("list", { name: "Profile links" });
    const first = await list.getByRole("listitem").first().textContent();
    await list
      .getByRole("button", { name: /^Move / })
      .first()
      .click();
    await page.getByRole("menuitem", { name: "Move down" }).click();
    await expect(list.getByRole("listitem").nth(1)).toContainText(
      first
        ?.split("·")[0]
        ?.replace(/^Move\s*/, "")
        .trim() ?? "",
    );
    await expect(page.getByRole("status").filter({ hasText: "moved to position" })).toContainText(
      "moved to position 2",
    );
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "Committed" })).toContainText(
      "Committed to drafts/profile",
    );
  });

  test("studio routes are accessible", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await signInFake(page);
    for (const path of ["/studio", "/studio/new", "/studio/profile"]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const results = await new AxeBuilder({ page }).analyze();
      const serious = results.violations.filter(
        (v) => v.impact === "serious" || v.impact === "critical",
      );
      expect(serious, `${path}: ${JSON.stringify(serious, null, 2)}`).toEqual([]);
    }
  });
});
