import { test, expect } from "@playwright/test";
import { signIn, createPerson } from "./helpers.mjs";

// The certification checklist is where every reported problem has landed. These
// drive it the way a user does — click, then reload and check it really stuck.
// An API test cannot catch a control that is not wired to anything.

test.describe("certification checklist", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("ticking a box saves, and is still ticked after a reload", async ({ page }) => {
    await createPerson(page, "CertOne");

    const qpr = page.getByLabel(/QPR Training Complete/i);
    await expect(qpr).not.toBeChecked();

    await qpr.click();
    await expect(qpr).toBeChecked();          // moves immediately, no waiting
    await page.waitForTimeout(1500);          // let the save land

    await page.reload();
    await expect(page.getByLabel(/QPR Training Complete/i)).toBeChecked();
  });

  test("an impatient double click still leaves it ticked", async ({ page }) => {
    // The reported fault: the control looked dead, users clicked again, and the
    // two clicks cancelled out.
    await createPerson(page, "CertDouble");

    const box = page.getByLabel(/Application Received/i);
    await box.click();
    await box.click({ force: true });          // second click while saving
    await page.waitForTimeout(2000);

    await page.reload();
    await expect(page.getByLabel(/Application Received/i)).toBeChecked();
  });

  test("training and renewal dates save", async ({ page }) => {
    await createPerson(page, "CertDates");

    await page.getByLabel(/Training Date/i).fill("2026-07-07");
    await page.getByLabel(/Renewal Date/i).fill("2027-07-07");
    await page.getByLabel(/Renewal Date/i).blur();
    await page.waitForTimeout(1500);

    await page.reload();
    // The seventh, not the sixth.
    await expect(page.getByLabel(/Training Date/i)).toHaveValue("2026-07-07");
    await expect(page.getByLabel(/Renewal Date/i)).toHaveValue("2027-07-07");
  });

  test("background check status and date save together", async ({ page }) => {
    await createPerson(page, "CertBg");

    await page.getByRole("combobox").first().click();
    await page.getByRole("option", { name: /passed/i }).click();
    await page.waitForTimeout(1200);

    await page.getByLabel(/Check Date/i).fill("2026-05-01");
    await page.getByLabel(/Check Date/i).blur();
    await page.waitForTimeout(1500);

    await page.reload();
    await expect(page.getByLabel(/Check Date/i)).toHaveValue("2026-05-01");
    // Expiry is worked out from the check date and shown in plain words.
    await expect(page.getByText(/valid until/i)).toBeVisible();
  });

  test("no error appears while working through the checklist", async ({ page }) => {
    // "Could not save certification" is the message users reported. It must not
    // appear once during an ordinary pass through the form.
    await createPerson(page, "CertQuiet");

    await page.getByLabel(/Application Received/i).click();
    await page.waitForTimeout(800);
    await page.getByLabel(/QPR Training Complete/i).click();
    await page.waitForTimeout(800);
    await page.getByLabel(/Training Date/i).fill("2026-08-01");
    await page.getByLabel(/Training Date/i).blur();
    await page.waitForTimeout(1500);

    await expect(page.getByText(/could not save/i)).toHaveCount(0);
  });

  test("the overall status updates as the checklist is completed", async ({ page }) => {
    await createPerson(page, "CertStatus");
    await expect(page.getByText(/not started/i).first()).toBeVisible();

    await page.getByLabel(/Application Received/i).click();
    await expect(page.getByText(/in progress/i).first()).toBeVisible({ timeout: 10_000 });
  });
});
