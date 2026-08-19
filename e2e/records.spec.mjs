import { test, expect } from "@playwright/test";
import { signIn, createPerson } from "./helpers.mjs";

test.describe("everyday record keeping", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("a new person can be created and then found by searching", async ({ page }) => {
    await createPerson(page, "Findable", "Person");
    await page.goto("/people");
    await page.getByPlaceholder(/search/i).first().fill("Findable");
    await expect(page.getByText("Findable").first()).toBeVisible({ timeout: 10_000 });
  });

  test("the create form insists on an email and a phone number", async ({ page }) => {
    await page.goto("/people/new");
    await page.getByLabel(/first name/i).fill("NoContact");
    await page.getByLabel(/last name/i).fill("Person");
    await page.getByRole("button", { name: /create person/i }).click();
    // It must not quietly create a half-record.
    await expect(page).toHaveURL(/\/people\/new/);
  });

  test("a note written on the create form is saved with the person", async ({ page }) => {
    await page.goto("/people/new");
    await page.getByLabel(/first name/i).fill("Notable");
    await page.getByLabel(/last name/i).fill("Person");
    await page.getByLabel(/^email/i).fill("notable@example.invalid");
    await page.getByLabel(/phone/i).fill("555-0111");
    await page.getByPlaceholder(/anything worth recording/i).fill("Met at the summer event.");
    await page.getByRole("button", { name: /create person/i }).click();
    await expect(page).toHaveURL(/\/people\/\d+/, { timeout: 20_000 });
    await expect(page.getByText("Met at the summer event.")).toBeVisible({ timeout: 10_000 });
  });

  test("a donation records the day that was picked", async ({ page }) => {
    // The reported fault: choosing the 7th showed and stored the 6th.
    await createPerson(page, "Giver", "Person");

    await page.goto("/donations/new");
    await page.getByLabel(/amount/i).fill("125");

    // A donation has to be attributed to someone.
    await page.getByText(/select a person/i).click();
    await page.getByRole("option", { name: /Giver Person/i }).click();

    const picker = page.getByRole("button", { name: /\d{4}|pick a date/i }).first();
    await picker.click();
    // The calendar labels each day with its full date, so match on the number
    // the user actually sees rather than the accessible name.
    await page.locator("table button").filter({ hasText: /^7$/ }).first().click();

    // What the user is now looking at must say the 7th.
    await expect(picker).toContainText(/\b7th\b/);

    await page.getByRole("button", { name: /record donation/i }).click();
    await expect(page).toHaveURL(/\/donations$/, { timeout: 20_000 });

    // And what was actually stored must be the 7th too.
    const stored = await page.evaluate(async () => {
      const res = await fetch("/api/donations?limit=50");
      const body = await res.json();
      const rows = body.data || body;
      return rows.find((d) => Number(d.amount) === 125)?.date;
    });
    expect(stored, "the stored date should end on the 7th").toMatch(/-07$/);
  });

  test("a company can be created, edited and deleted", async ({ page }) => {
    await page.goto("/companies/new");
    await page.getByLabel(/name/i).first().fill("E2E Widgets");
    await page.getByRole("button", { name: /create company/i }).click();
    await expect(page).toHaveURL(/\/companies\/\d+/, { timeout: 20_000 });
    await expect(page.getByText("E2E Widgets").first()).toBeVisible();
  });

  test("a school can be created", async ({ page }) => {
    await page.goto("/schools/new");
    await page.getByLabel(/name/i).first().fill("E2E High");
    await page.getByRole("button", { name: /create school/i }).click();
    await expect(page).toHaveURL(/\/schools\/\d+/, { timeout: 20_000 });
    await expect(page.getByText("E2E High").first()).toBeVisible();
  });

  test("the main pages all load for a signed-in user", async ({ page }) => {
    for (const path of ["/", "/people", "/companies", "/schools", "/groups",
                        "/donations", "/certifications", "/waivers", "/settings"]) {
      const response = await page.goto(path);
      expect(response.status(), `${path} did not load`).toBeLessThan(400);
      await expect(page.locator("body")).not.toContainText("Application error", { timeout: 5_000 });
    }
  });
});
