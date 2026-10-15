import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const examples = {
  template: {
    source: await readFile(new URL('../../playground/manifests/platform/resourcepermittemplates/temporary-config.yaml', import.meta.url), 'utf8'),
    guides: {
      defaultDuration: 'concepts/templates/#choose-the-execution-identity-and-limits',
      impersonation: 'concepts/templates/#choose-the-execution-identity-and-limits',
      approvals: 'concepts/requests/#review-and-control-a-permit',
      paramSchema: 'concepts/parameter-schema/',
      resources: 'concepts/managed-resources/#resource-policy',
    },
  },
  permit: {
    source: await readFile(new URL('../../playground/manifests/user/solar/resourcepermits/temporary-config.yaml', import.meta.url), 'utf8'),
    guides: {
      template: 'concepts/templates/#choose-the-template-scope',
      params: 'concepts/parameter-schema/',
      reason: 'concepts/requests/#create-and-inspect-a-request',
      duration: 'concepts/requests/#review-and-control-a-permit',
    },
  },
};

test('explore both resources independently and copy or download complete YAML', async ({ page, context, isMobile, baseURL }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto(baseURL);
  await expect(page.locator('[data-permit-example]')).toHaveCount(2);
  for (const [id, { source, guides }] of Object.entries(examples)) {
    const example = page.locator(`[data-permit-example="${id}"]`);
    expect(await example.locator('[data-permit-source]').textContent()).toBe(source);
    await expect(example.locator('[data-permit-part]')).toHaveCount(Object.keys(guides).length);
    if (!isMobile) {
      for (const key of Object.keys(guides)) {
        const block = example.locator(`[data-permit-part="${key}"]`);
        await block.focus();
        await block.press('Enter');
        await expect(block).toHaveAttribute('aria-current', 'true');
        await expect(example.locator(`[data-permit-help="${key}"]`)).toBeVisible();
        await expect(example.locator('[data-permit-help]:visible')).toHaveCount(1);
      }
    }
    await example.getByRole('button', { name: 'Copy YAML', exact: true }).click();
    await expect(example.getByRole('status')).toHaveText('Complete YAML copied.');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(source);
    const download = await page.request.get(await example.getByRole('link', { name: 'Download YAML' }).getAttribute('href'));
    expect(download.ok()).toBeTruthy();
    expect(await download.text()).toBe(source);
  }
  // Selecting the permit must not reset the template's independently selected block.
  if (!isMobile) await expect(page.locator('[data-permit-example="template"] [data-permit-help="resources"]')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.locator('[data-permit-example="permit"] [data-permit-help]:visible').getByRole('link', { name: 'API reference' }).click();
  await expect(page).toHaveURL(new RegExp(`/docs/reference/api/#resourcepermitspec${isMobile ? 'template' : ''}$`));
});

test('YAML blocks open their matching guides on touch or in a new tab', async ({ page, context, isMobile, baseURL }) => {
  for (const [id, { guides }] of Object.entries(examples)) {
    for (const [key, guide] of Object.entries(guides)) {
      await page.goto(baseURL);
      const block = page.locator(`[data-permit-example="${id}"] [data-permit-part="${key}"]`);
      let destination = page;
      if (isMobile) await block.tap();
      else {
        const opened = context.waitForEvent('page');
        await block.click({ modifiers: ['ControlOrMeta'] });
        destination = await opened;
      }
      await expect(destination).toHaveURL(new URL(`docs/${guide}`, baseURL).href);
      const fragment = guide.split('#')[1];
      if (fragment) await expect(destination.locator(`#${fragment}`)).toBeVisible();
      if (!isMobile) await destination.close();
    }
  }
});

test('pointer selection and copy failure remain usable in dark mode', async ({ page, isMobile, baseURL }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: async () => { throw new Error('Permission denied'); } },
  }));
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto(baseURL);
  const example = page.locator('[data-permit-example="template"]');
  if (!isMobile) {
    await example.locator('[data-permit-part="approvals"]').click();
    await expect(example.locator('[data-permit-help="approvals"]')).toBeVisible();
  }
  await example.getByRole('button', { name: 'Copy YAML', exact: true }).click();
  await expect(example.getByRole('status')).toContainText('Use Download YAML');
  await expect(example.getByRole('link', { name: 'Download YAML' })).toBeVisible();
});

test('without JavaScript both YAML examples and their guide links are usable', async ({ browser, baseURL, viewport }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport });
  try {
    const page = await context.newPage();
    await page.goto(baseURL);
    for (const [id, { source }] of Object.entries(examples)) {
      const example = page.locator(`[data-permit-example="${id}"]`);
      expect(await example.locator('[data-permit-source]').textContent()).toBe(source);
      await expect(example.getByRole('button', { name: 'Copy YAML', exact: true })).toBeHidden();
    }
    await page.locator('[data-permit-example="permit"] [data-permit-part="template"]').click();
    await expect(page).toHaveURL(new URL('docs/concepts/templates/#choose-the-template-scope', baseURL).href);
  } finally {
    await context.close();
  }
});
