import { expect } from "@playwright/test";

export const USER = { email: "e2e@fightclub.test", password: "e2e-test-password" };

export async function signIn(page) {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(USER.email);
  await page.getByLabel(/password/i).fill(USER.password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/$|\/dashboard/, { timeout: 20_000 });
}

// Creates a person through the form the way a user would, and returns their name.
export async function createPerson(page, first, last = "Tester") {
  await page.goto("/people/new");
  await page.getByLabel(/first name/i).fill(first);
  await page.getByLabel(/last name/i).fill(last);
  await page.getByLabel(/^email/i).fill(`${first.toLowerCase()}@example.invalid`);
  await page.getByLabel(/phone/i).fill("555-0100");
  await page.getByRole("button", { name: /create person/i }).click();
  await expect(page).toHaveURL(/\/people\/\d+/, { timeout: 20_000 });
  return `${first} ${last}`;
}

export const personIdFromUrl = (page) => Number(page.url().match(/\/people\/(\d+)/)[1]);
