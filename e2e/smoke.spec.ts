import { expect, test } from '@playwright/test';
import { checkMobile, snap } from './helpers';

test('log care, add a pet and a task, review the log', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Every feed, walk and dose');
  await expect(page.locator('.hero .wchart svg')).toBeVisible();
  await page.waitForTimeout(1400);
  await snap(page, 'landing');
  await checkMobile(page, 'landing-mobile');

  await page.getByRole('link', { name: 'See today’s care' }).click();
  await page.getByRole('button', { name: 'Mark done: Long walk for Pip' }).click();
  await expect(page.getByText('Logged “Long walk” for Pip.')).toBeVisible();
  await snap(page, 'today');
  await checkMobile(page);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Mark done: Long walk for Pip' })).toHaveCount(0);

  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Pets' }).click();
  await page.getByRole('link', { name: 'Add pet' }).click();
  await page.getByLabel('Name').fill('Biscuit');
  await page.getByLabel('Species').selectOption('Cat');
  await page.getByRole('button', { name: 'Save pet' }).click();
  await expect(page.getByRole('heading', { name: 'Biscuit' })).toBeVisible();
  await page.getByLabel('Task', { exact: true }).fill('Breakfast');
  await page.getByLabel('Times per day').fill('2');
  await page.getByRole('button', { name: 'Add task' }).click();
  await expect(page.getByRole('cell', { name: '2× a day' })).toBeVisible();
  await page.getByLabel('Weight (kg)').fill('3.9');
  await page.getByRole('button', { name: 'Record weight' }).click();
  await expect(page.getByText('3.9 kg').first()).toBeVisible();

  await page.getByRole('link', { name: 'Pets' }).first().click();
  await page.getByRole('link', { name: /^Pip Dog/ }).click();
  await snap(page, 'pet');
  await checkMobile(page, 'pet-mobile');

  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Care log' }).click();
  await page.getByLabel('Pet').selectOption({ label: 'Miso' });
  await expect(page.getByText(/Showing 1–12 of/)).toBeVisible();
  await snap(page, 'log');
});
