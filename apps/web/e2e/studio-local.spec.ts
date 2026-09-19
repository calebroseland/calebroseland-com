import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "./fixtures.ts";
import { scratchContentDir } from "./global-setup.ts";
import { noisePng } from "./png.ts";

/* Working-tree mode: the studio edits the real files on the checked-out branch. These tests read the
   files back from disk, because "it wrote the file" is the whole claim. The dev server points at a
   scratch copy of content/ (see global-setup), so nothing here touches the repository. */

const onDisk = (rel: string) => readFileSync(join(scratchContentDir, rel), "utf8");

async function signInLocal(page: import("@playwright/test").Page) {
  await page.goto("/studio/login");
  await page.evaluate(() => localStorage.clear());
  await page.getByText("Developer options").click();
  await page.getByRole("button", { name: "Edit files on this branch" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Studio" })).toBeVisible();
}

/* Writing content makes the dev server broadcast a reload to every open page, so these run one at a
   time rather than racing each other through a reload. */
test.describe.configure({ mode: "serial" });

test.describe("working-tree mode", () => {
  test("lists the files on this branch and names the branch it is editing", async ({ page }) => {
    await signInLocal(page);
    await expect(page.getByText(/working tree · /)).toBeVisible();
    const files = page.getByRole("region", { name: /^Files on this branch/ });
    await expect(files.getByRole("link", { name: "Hello, placeholder" })).toBeVisible();
    await expect(files.getByRole("link", { name: "About" })).toBeVisible();
    // Branch and pull-request vocabulary has no meaning here.
    await expect(page.getByRole("region", { name: /^In progress/ })).toHaveCount(0);
  });

  test("editing a post writes the markdown straight to the file", async ({ page }) => {
    await signInLocal(page);
    await page
      .getByRole("region", { name: /^Files on this branch/ })
      .getByRole("link", { name: "Hello, placeholder" })
      .click();
    await expect(page).toHaveURL(/\/studio\/hello-placeholder$/);
    await expect(page.getByRole("textbox", { name: "Post body" })).toContainText("Lorem ipsum");
    // No branch to publish from: the file is already on the branch.
    await expect(page.getByRole("button", { name: "Publish" })).toHaveCount(0);

    await page.getByRole("textbox", { name: "Post body" }).click();
    await page.keyboard.press("ControlOrMeta+End");
    await page.keyboard.press("Enter");
    await page.keyboard.type("Edited from the browser.");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "working tree" })).toContainText(
      "Saved content/posts/2026/09-18-hello-placeholder to your working tree",
    );

    const file = onDisk("posts/2026/09-18-hello-placeholder/index.md");
    expect(file).toContain("Edited from the browser.");
    expect(file).toContain("title: Hello, placeholder");
    expect(file).toContain("Lorem ipsum");
  });

  test("a page is created on disk and renders on the site without a publish step", async ({
    page,
  }) => {
    await signInLocal(page);
    await page.getByRole("link", { name: "New entry" }).click();
    await page.getByRole("radio", { name: /^page/i }).check();
    await page.getByLabel("Title").fill("Uses");
    await page.getByRole("button", { name: "Create page" }).click();
    await expect(page).toHaveURL(/\/studio\/uses$/);

    await page.getByRole("textbox", { name: "Post body" }).click();
    await page.keyboard.type("The tools behind this site.");
    await page.getByRole("checkbox", { name: /Draft/ }).uncheck();
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "working tree" })).toBeVisible();

    expect(onDisk("pages/uses/index.md")).toContain("The tools behind this site.");

    // The content pipeline picks the new file up, so the page is live with nothing further to do.
    await page.goto("/uses");
    expect(new URL(page.url()).pathname).toBe("/uses");
    await expect(page.getByRole("heading", { level: 1, name: "Uses" })).toBeVisible();
    await expect(page.getByText("The tools behind this site.")).toBeVisible();
  });

  test("a file changed outside the browser is detected instead of being overwritten", async ({
    page,
    request,
  }) => {
    await signInLocal(page);
    await page
      .getByRole("region", { name: /^Files on this branch/ })
      .getByRole("link", { name: "Second placeholder" })
      .click();
    await expect(page).toHaveURL(/\/studio\/second-placeholder$/);
    await page.getByRole("textbox", { name: "Post body" }).click();
    await page.keyboard.type("Browser edit. ");

    // Something else changes the same tree while the browser holds an older copy. Writing through the
    // store, as another tool would, moves the tree without reloading this page.
    const about = onDisk("pages/about/index.md");
    const wrote = await request.post("/@local/write", {
      data: {
        files: [
          {
            path: "content/pages/about/index.md",
            content: `${about}\nChanged elsewhere.\n`,
            encoding: "utf-8",
          },
        ],
      },
    });
    expect(wrote.ok()).toBe(true);

    await page.getByRole("button", { name: "Save", exact: true }).click();
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toContainText("changed on disk");
    await dialog.getByRole("button", { name: "Cancel" }).click();
    expect(onDisk("posts/2026/09-19-second-placeholder/index.md")).not.toContain("Browser edit.");
  });

  test("an image is resized, written beside the markdown, and referenced from it", async ({
    page,
  }) => {
    await signInLocal(page);
    await page.getByRole("link", { name: "New entry" }).click();
    await page.getByLabel("Title").fill("With Photo");
    await page.getByRole("button", { name: "Create post" }).click();
    await expect(page).toHaveURL(/\/studio\/with-photo$/);

    await page
      .locator('input[type="file"]')
      .setInputFiles({ name: "photo.png", mimeType: "image/png", buffer: noisePng() });
    await expect(page.getByRole("tab", { name: /Images \(1\)/ })).toBeVisible();
    await page.getByLabel(/Alt text for photo\.png/).fill("Noise, for the size of it");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "working tree" })).toBeVisible();

    const dir = "posts/2026/09-19-with-photo";
    const image = statSync(join(scratchContentDir, dir, "photo.png"));
    // Well past the point where encoding the bytes in one call used to overflow the argument stack.
    expect(image.size).toBeGreaterThan(100_000);
    // Alt text typed in the panel has to reach the markdown, or the published image has none.
    expect(onDisk(`${dir}/index.md`)).toContain("![Noise, for the size of it](photo.png)");
  });

  test("deleting an entry removes its directory from the working tree", async ({ page }) => {
    await signInLocal(page);
    await page.getByRole("link", { name: "New entry" }).click();
    await page.getByLabel("Title").fill("Temporary");
    await page.getByRole("button", { name: "Create post" }).click();
    // Creating already wrote the file, so there is nothing to save yet.
    await expect(page).toHaveURL(/\/studio\/temporary$/);
    await expect(page.getByRole("button", { name: "Save", exact: true })).toBeDisabled();

    await page.getByRole("link", { name: "← Entries" }).click();
    const row = page.getByRole("listitem").filter({ hasText: "Temporary" });
    await row.getByRole("button", { name: /^Actions for/ }).click();
    await page.getByRole("menuitem", { name: "Delete entry" }).click();
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toContainText("from your working tree");
    await dialog.getByRole("button", { name: "Delete" }).click();
    await expect(page.getByRole("link", { name: "Temporary" })).toHaveCount(0);
  });
});
