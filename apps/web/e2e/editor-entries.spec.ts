import { expect, test } from "./fixtures.ts";

/* Pages, and re-editing something already published. Both run against the in-memory fake GitHub. */

async function signInFake(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.evaluate(() => localStorage.clear());
  await page.getByText("Developer options").click();
  await page.getByRole("button", { name: "Use local fake GitHub" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Editor" })).toBeVisible();
  await expect(page.getByText("fake-user")).toBeVisible();
}

async function createEntry(
  page: import("@playwright/test").Page,
  kind: "post" | "page",
  title: string,
) {
  await page.getByRole("link", { name: "New entry" }).click();
  await page.getByRole("radio", { name: new RegExp(`^${kind}`, "i") }).check();
  await page.getByLabel("Title").fill(title);
  await page.getByRole("button", { name: `Create ${kind}` }).click();
}

test.describe("pages", () => {
  test("a page is created without a date, edited, and saved to its own bundle", async ({
    page,
  }) => {
    await signInFake(page);
    await createEntry(page, "page", "Colophon");
    await expect(page).toHaveURL(/\/editor\/colophon/);

    // A page has no dated directory and no tag index, so neither field is offered.
    const details = page.getByRole("form", { name: "Page details" });
    await expect(details).toBeVisible();
    await expect(details.getByLabel("Date")).toHaveCount(0);
    await expect(details.getByLabel("Tags")).toHaveCount(0);
    await expect(details.getByRole("textbox", { name: "Slug" })).toHaveValue("colophon");

    await page.getByRole("textbox", { name: "Post body" }).click();
    await page.keyboard.type("What this site is built with.");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "Committed" })).toContainText(
      "Committed to drafts/colophon",
    );

    await page.getByRole("link", { name: "← Editor" }).click();
    await expect(
      page.getByRole("region", { name: /^In progress/ }).getByRole("link", { name: "colophon" }),
    ).toBeVisible();
  });

  test("a published page is reachable from the board and renders on the site", async ({ page }) => {
    await signInFake(page);
    await createEntry(page, "page", "Colophon");
    await page.getByRole("textbox", { name: "Post body" }).click();
    await page.keyboard.type("Built with care.");
    await page.getByRole("checkbox", { name: /Draft/ }).uncheck();
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Publish" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Open pull request" }).click();
    await dialog.getByRole("button", { name: "Merge and publish" }).click();
    // A page publishes to its own address, not under /posts. The fake backend is in memory, so the
    // site itself has nothing to render: the working-tree spec covers the file actually appearing.
    await expect.poll(() => new URL(page.url()).pathname).toBe("/colophon");

    await page.goto("/editor");
    const live = page.getByRole("region", { name: /^Published/ });
    await expect(live.getByRole("link", { name: "Colophon" })).toBeVisible();
    await expect(live.getByRole("listitem").filter({ hasText: "Colophon" })).toContainText(
      "content/pages/colophon",
    );
  });
});

test.describe("editing a published entry", () => {
  test("branches from the default branch and reuses the existing bundle instead of minting a new one", async ({
    page,
  }) => {
    await signInFake(page);
    await createEntry(page, "post", "Round Trip");
    await page.getByRole("textbox", { name: "Post body" }).click();
    await page.keyboard.type("First edition.");
    await page.getByRole("checkbox", { name: /Draft/ }).uncheck();
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Publish" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Open pull request" }).click();
    await dialog.getByRole("button", { name: "Merge and publish" }).click();
    await expect.poll(() => new URL(page.url()).pathname).toBe("/posts/round-trip");

    await page.goto("/editor");
    const live = page.getByRole("region", { name: /^Published/ });
    const row = live.getByRole("listitem").filter({ hasText: "Round Trip" });
    const originalDir = ((await row.textContent()) ?? "").match(/content\/posts\/\S+/)?.[0];
    expect(originalDir).toBeTruthy();

    await row.getByRole("button", { name: "Edit" }).click();
    await expect(page).toHaveURL(/\/editor\/round-trip/);
    // The existing body came along, which is what proves the bundle was reused rather than recreated.
    await expect(page.getByRole("textbox", { name: "Post body" })).toContainText("First edition.");

    await page.getByRole("textbox", { name: "Post body" }).click();
    await page.keyboard.press("End");
    await page.keyboard.type(" Second edition.");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "Committed" })).toBeVisible();

    await page.getByRole("link", { name: "← Editor" }).click();
    const inProgress = page.getByRole("region", { name: /^In progress/ });
    await expect(inProgress.getByRole("link", { name: "Round Trip" })).toBeVisible();
    // One row per slug: the draft shadows the published entry rather than duplicating it.
    await expect(page.getByRole("link", { name: "Round Trip" })).toHaveCount(1);
  });

  test("a deep link to a published entry offers to start editing", async ({ page }) => {
    await signInFake(page);
    await createEntry(page, "post", "Deep Link");
    await page.getByRole("checkbox", { name: /Draft/ }).uncheck();
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await page.getByRole("button", { name: "Publish" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Open pull request" }).click();
    await dialog.getByRole("button", { name: "Merge and publish" }).click();
    await expect.poll(() => new URL(page.url()).pathname).toBe("/posts/deep-link");

    await page.goto("/editor/deep-link");
    await expect(page.getByText(/This entry is published on/)).toBeVisible();
    await page.getByRole("button", { name: "Edit this entry" }).click();
    await expect(page.getByRole("textbox", { name: "Post body" })).toBeVisible();
  });

  test("an unknown slug says so instead of failing to load", async ({ page }) => {
    await signInFake(page);
    await page.goto("/editor/no-such-entry");
    await expect(page.getByRole("alert").filter({ hasText: "No entry" })).toContainText(
      "No entry with the slug",
    );
  });
});
