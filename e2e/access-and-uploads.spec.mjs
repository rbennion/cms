import { test, expect } from "@playwright/test";
import { signIn, createPerson } from "./helpers.mjs";
import { writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

test.describe("getting in and staying out", () => {
  test("a signed-out visitor is sent to the sign-in page", async ({ page }) => {
    for (const path of ["/people", "/certifications", "/donations", "/settings"]) {
      await page.goto(path);
      await expect(page, `${path} was reachable without signing in`).toHaveURL(/\/login/);
    }
  });

  test("the wrong password does not get in", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill("e2e@fightclub.test");
    await page.getByLabel(/password/i).fill("definitely-not-the-password");
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForTimeout(2500);
    await expect(page).toHaveURL(/\/login/);
  });

  test("signing in works and the session survives a reload", async ({ page }) => {
    await signIn(page);
    await page.reload();
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.getByText(/dashboard/i).first()).toBeVisible();
  });
});

test.describe("uploading a document", () => {
  const file = join(tmpdir(), "e2e-application.pdf");

  test.beforeAll(() => {
    writeFileSync(file, Buffer.from("%PDF-1.4\n% e2e test document\n%%EOF\n"));
  });
  test.afterAll(() => { try { unlinkSync(file); } catch {} });

  test("a document uploads, is listed, and can be opened again", async ({ page }) => {
    await signIn(page);
    await createPerson(page, "Uploader", "Person");

    // The upload button opens a hidden file input; set the file on it directly.
    const chooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: /^upload$/i }).first().click();
    await (await chooser).setFiles(file);

    // The name, size and date come back from storage once it has landed.
    await expect(page.getByText("e2e-application.pdf")).toBeVisible({ timeout: 30_000 });

    // And it survives a reload, meaning the path really was recorded.
    await page.reload();
    await expect(page.getByText("e2e-application.pdf")).toBeVisible({ timeout: 15_000 });

    // Opening it should return the file, not an error page.
    const view = page.getByRole("link", { name: /view/i }).first();
    await expect(view).toBeVisible();
    const href = await view.getAttribute("href");
    const response = await page.request.get(href);
    expect(response.status()).toBe(200);
  });

  test("an oversized file is refused before anything is sent", async ({ page }) => {
    const big = join(tmpdir(), "e2e-too-big.pdf");
    // Just over the 100 MB ceiling.
    writeFileSync(big, Buffer.alloc(101 * 1024 * 1024, 0));
    try {
      await signIn(page);
      await createPerson(page, "TooBig", "Person");
      const chooser = page.waitForEvent("filechooser");
      await page.getByRole("button", { name: /^upload$/i }).first().click();
      await (await chooser).setFiles(big);
      await expect(page.getByText(/limit is 100 MB/i)).toBeVisible({ timeout: 20_000 });
    } finally {
      try { unlinkSync(big); } catch {}
    }
  });
});
