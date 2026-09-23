import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { expect, test } from "./fixtures.ts";
import { scratchContentDir } from "./global-setup.ts";
import { noisePng } from "./png.ts";

/* Working-tree mode: the editor edits the real files on the checked-out branch. These tests read the
   files back from disk, because "it wrote the file" is the whole claim. The dev server points at a
   scratch copy of content/ (see global-setup), so nothing here touches the repository. */

const onDisk = (rel: string) => readFileSync(join(scratchContentDir, rel), "utf8");

/** A new post's directory is named for the day it was created, so find it by slug. */
function postDir(slug: string): string {
  const posts = join(scratchContentDir, "posts");
  for (const year of readdirSync(posts)) {
    const match = readdirSync(join(posts, year)).find((d) => d.endsWith(`-${slug}`));
    if (match) return `posts/${year}/${match}`;
  }
  throw new Error(`no post directory for ${slug}`);
}

async function signInLocal(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.evaluate(() => localStorage.clear());
  await page.getByText("Developer options").click();
  await page.getByRole("button", { name: "Edit files on this branch" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Editor" })).toBeVisible();
}

/* Writing content makes the dev server broadcast a reload to every open page, so these run one at a
   time rather than racing each other through a reload. */
test.describe.configure({ mode: "serial" });

test.describe("working-tree mode", () => {
  test("lists the files on this branch and names the branch it is editing", async ({ page }) => {
    await signInLocal(page);
    // The board says who is signed in and in which mode; here that is the checked-out branch.
    await expect(page.getByText(/Signed in as .+ · working tree/)).toBeVisible();
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
    await expect(page).toHaveURL(/\/editor\/hello-placeholder$/);
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
    await expect(page).toHaveURL(/\/editor\/uses$/);

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
    await expect(page).toHaveURL(/\/editor\/second-placeholder$/);
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
    await expect(page).toHaveURL(/\/editor\/with-photo$/);

    await page
      .locator('input[type="file"]')
      .setInputFiles({ name: "photo.png", mimeType: "image/png", buffer: noisePng() });
    await expect(page.getByRole("tab", { name: /Images \(1\)/ })).toBeVisible();
    await page.getByLabel(/Alt text for photo\.png/).fill("Noise, for the size of it");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "working tree" })).toBeVisible();

    const dir = postDir("with-photo");
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
    await expect(page).toHaveURL(/\/editor\/temporary$/);
    await expect(page.getByRole("button", { name: "Save", exact: true })).toBeDisabled();

    await page.getByRole("link", { name: "← Editor" }).click();
    const row = page.getByRole("listitem").filter({ hasText: "Temporary" });
    await row.getByRole("button", { name: /^Actions for/ }).click();
    await page.getByRole("menuitem", { name: "Delete entry" }).click();
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toContainText("from your working tree");
    await dialog.getByRole("button", { name: "Delete" }).click();
    await expect(page.getByRole("link", { name: "Temporary" })).toHaveCount(0);
  });

  test("the landing card edits in place and saves profile.yaml to the working tree", async ({
    page,
  }) => {
    await signInLocal(page);
    // Whatever the tags are, a new one lands last, and one step left puts it before the last.
    const tagsOnDisk = () =>
      (parse(onDisk("profile.yaml")).tags as Array<string | { label: string }>).map((t) =>
        typeof t === "string" ? t : t.label,
      );
    const before = tagsOnDisk();
    await page.goto("/");
    await page.getByRole("button", { name: "Edit card" }).click();
    const form = page.getByRole("form", { name: "Edit card" });
    await expect(form.getByText("Saves to content/profile.yaml on this branch.")).toBeVisible();

    await form.getByRole("textbox", { name: "Tagline" }).fill("Builds calm software");
    await form.getByRole("textbox", { name: "New focus area" }).fill("Accessibility");
    await form.getByRole("textbox", { name: "New focus area" }).press("Enter");
    await form.getByRole("button", { name: /^Accessibility\./ }).focus();
    await page.keyboard.press("ArrowLeft");
    await expect(form.getByRole("button", { name: /^Accessibility\./ })).toBeFocused();
    await form.getByRole("button", { name: "Save card" }).click();

    await expect(form).toHaveCount(0);
    await expect.poll(() => onDisk("profile.yaml")).toContain("tagline: Builds calm software");
    const yaml = onDisk("profile.yaml");
    expect(tagsOnDisk()).toEqual([...before.slice(0, -1), "Accessibility", ...before.slice(-1)]);
    // Untouched lines keep their hand-written form.
    expect(yaml).toMatch(/^# /);
    expect(yaml).toContain(
      "- { label: GitHub, url: https://github.com/calebroseland, icon: mdiGithub }",
    );
    await expect(page.getByText("Builds calm software")).toBeVisible();
  });

  test("the Pages filter shows only the site's pages and opens one in the editor", async ({
    page,
  }) => {
    await signInLocal(page);
    await page
      .getByRole("navigation", { name: "Show" })
      .getByRole("link", { name: /^Pages/ })
      .click();
    await expect(page).toHaveURL(/\/editor\/?\?kind=page$/);
    const board = page.getByRole("main");
    await expect(board.getByRole("link", { name: "About", exact: true })).toBeVisible();
    await expect(board.getByRole("link", { name: /placeholder/i })).toHaveCount(0);

    // Other tests in this file add pages of their own, so pick About's own row.
    await board
      .locator("li")
      .filter({ has: page.getByRole("link", { name: "About", exact: true }) })
      .getByRole("link", { name: "Edit" })
      .click();
    await expect(page).toHaveURL(/\/editor\/about/);
    await expect(page.getByRole("heading", { level: 1, name: "About" })).toBeVisible();
  });
});
